const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const csvParser = require('csv-parser');

const genAI = new GoogleGenerativeAI('AIzaSyBDNUsBHYRoqceEq7nokOrGdqG4u-pJOmk');
const csvFilePath = 'amazon_vfl_reviews_1.csv'; // Your dataset path

// Step 1: Group reviews by product
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

// Step 2: Aggregate reviews for each product
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
  
  // Step 4: Analyze aggregated reviews for each product
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
  
    console.log(`Product: ${productName}`);
    console.log(`Overall Rating: ${averageRating}`);
    console.log(`Summary: \n${analysis}`);
  
    // Return the summarized analysis for the product
    return analysis;
  }

  
  
  // Main function to run the analysis
  async function run() {
    const reviews = await readReviews();
    
    // Step 1: Group reviews by product
    const groupedReviews = groupReviewsByProduct(reviews);
  
    // Step 2: Analyze each product's reviews
    for (const productName in groupedReviews) {
      const { reviews, ratings } = groupedReviews[productName];
  
      // Step 3: Generate a summarized review for each product
      await analyzeProductReviews(productName, reviews, ratings);
      console.log('-------------------------');
    }
  }
  
  run();