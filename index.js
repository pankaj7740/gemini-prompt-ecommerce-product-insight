const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const csvParser = require('csv-parser');

const genAI = new GoogleGenerativeAI('AIzaSyBDNUsBHYRoqceEq7nokOrGdqG4u-pJOmk');
const csvFilePath = 'amazon_vfl_reviews_1.csv'; // Your dataset path
const app = express();
const port = 3000;

const cors = require('cors');
app.use(cors());

// In-memory storage for product reviews
let productReviews = {};

// Step 1: Load and store reviews in memory
async function readReviews() {
  const reviews = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (row) => {
        reviews.push({
          productId: row.asin,
          productName: row.name, // Assuming product name is available
          rating: parseInt(row.rating),
          reviewText: row.review
        });
      })
      .on('end', () => {
        resolve(reviews);
      })
      .on('error', reject);
  });
}

// Step 2: Group reviews by product
function groupReviewsByProduct(reviews) {
  const groupedReviews = reviews.reduce((acc, review) => {
    const { productName, rating, reviewText } = review;

    if (!acc[productName]) {
      acc[productName] = {
        reviews: [],
        ratings: [],
      };
    }

    acc[productName].reviews.push(reviewText);
    acc[productName].ratings.push(rating);

    return acc;
  }, {});

  return groupedReviews;
}

// Step 3: Calculate average rating
function calculateAverageRating(ratings) {
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return (total / ratings.length).toFixed(2); // Round to 2 decimal places
}

// Step 4: Analyze aggregated reviews for a product
async function analyzeProductReviews(productName, reviews, ratings) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Aggregated review text
  const aggregatedReviewText = reviews.join('\n');

  // Calculate the overall average rating
  const averageRating = calculateAverageRating(ratings);

  // Create a detailed prompt for summarizing multiple reviews and adding overall rating
  const sentimentPrompt = `Summarize the overall sentiment, key features, rating discrepancies, and include an overall average rating of ${averageRating} for the product "${productName}" based on the following reviews:\n\n${aggregatedReviewText}`;

  const result = await model.generateContent([sentimentPrompt]);
  const analysis = result.response.text();

  return {
    productName,
    averageRating,
    summary: analysis,
  };
}

// Step 5: Initialize and store reviews in memory
async function initializeProductReviews() {
  const reviews = await readReviews();
  productReviews = groupReviewsByProduct(reviews);
  console.log('Product reviews initialized and stored in memory.');
}

function parseReviewSummary(summary) {
  // const result = {};

   // Split the summary into lines
   const parsedAnalysis = {};
 const lines = summary.split('\n');
 for (const line of lines) {
   const colonIndex = line.indexOf(':');
   if (colonIndex !== -1) {
     const key = line.substring(0, colonIndex).trim();
     const value = line.substring(colonIndex   
+ 1).trim();

     // Handle nested key-value pairs
     if (key === 'Key Features' || key === 'Rating Discrepancies') {
       const nestedKey = value.trim();
       if (!parsedAnalysis[key]) {
         parsedAnalysis[key] = {};
       }
       parsedAnalysis[key][nestedKey] = '';
     } else {
       parsedAnalysis[key] = value;
     }
   }
 }
 
   return parsedAnalysis
}


// API to get review analysis for a product by name
app.get('/analyze/:productName', async (req, res) => {
  const productName = req.params.productName;

  // Check if the product exists in memory
  if (!productReviews[productName]) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { reviews, ratings } = productReviews[productName];

  try {
    // Analyze product reviews and send response
    const analysis = await analyzeProductReviews(productName, reviews, ratings);
    
    const parsedSummary = parseReviewSummary(analysis.summary);
    res.json({
      productName: analysis.productName,
      averageRating: analysis.averageRating,
      summary: parsedSummary
    });
  } catch (error) {
    console.error('Error analyzing product reviews:', error);
    res.status(500).json({ error: 'Failed to analyze reviews' });
  }
});

// API to get the list of products
app.get('/products', (req, res) => {
  // const productNames = Object.keys(productReviews);

  // if (productNames.length === 0) {
  //   return res.status(404).json({ error: 'No products found' });
  // }

  // res.json({ products: productNames,   });

  const productData = [];
  for (const productName in productReviews) {
    const { reviews, ratings } = productReviews[productName];
    const averageRating = calculateAverageRating(ratings);

    productData.push({
      productName,
      numberOfReviews: reviews.length,
      averageRating,
    });
  }

  if (productData.length === 0) {
    return res.status(404).json({ error: 'No products found' });
  }

  res.json({ products: productData });
});

// Start the server after loading the reviews
initializeProductReviews().then(() => {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('Failed to initialize product reviews:', err);
});
