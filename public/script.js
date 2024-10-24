async function fetchProducts() {
    try {
        const response = await fetch('http://localhost:3000/products');
        const data = await response.json();
        
        console.log(data); // Log the data to check the response

        const productList = document.getElementById('product-list');
        productList.innerHTML = ''; // Clear existing products

        data.products.forEach(product => {
            const productCol = document.createElement('div');
            productCol.className = 'col-md-4'; // 3 cards per row for medium+ screens

            // Create the HTML structure for the product card
            const productCard = `
                <div class="card product-card h-100" onclick="analyzeProduct('${product.productName}')">
                    <div class="card-body text-center">
                        <h5 class="card-title">${product.productName}</h5>
                        <div class="rating mb-2">${'★'.repeat(Math.round(product.averageRating))}${'☆'.repeat(5 - Math.round(product.averageRating))}</div>
                        <p class="card-text">Reviews: ${product.numberOfReviews}</p>
                        <p class="card-text">Average Rating: ${product.averageRating}</p>
                    </div>
                </div>
            `;
            
            productCol.innerHTML = productCard;
            productList.appendChild(productCol);
        });
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

// Function to analyze the product reviews
// async function analyzeProduct(productName) {
//     try {
//         const response = await fetch(`http://localhost:3000/analyze/${encodeURIComponent(productName)}`);
//         const analysisData = await response.json();

//         const analysisDiv = document.getElementById('analysis');
//         analysisDiv.innerHTML = `<h2>Analysis for ${analysisData.productName}</h2>
//                                  <p><strong>Average Rating:</strong> ${analysisData.averageRating}</p>
//                                  <p><strong>Summary:</strong></p>
//                                  <pre>${JSON.stringify(analysisData.summary, null, 2)}</pre>`;
//         analysisDiv.style.display = 'block'; // Show analysis
//     } catch (error) {
//         console.error('Error analyzing product:', error);
//     }
// }

async function analyzeProduct(productName) {
    try {
        const response = await fetch(`http://localhost:3000/analyze/${productName}`);
        const data = await response.json();

        // Populate the modal with product analysis data
        const summary = formatSummary(data.summary);

        // Populate the modal with product analysis data
        document.getElementById('modalProductName').textContent = data.productName;
        document.getElementById('modalAverageRating').textContent = data.averageRating;
        document.getElementById('modalSummary').innerHTML = summary; // Use innerHTML for bold text formatting

        // Show the modal
        const productAnalysisModal = new bootstrap.Modal(document.getElementById('productAnalysisModal'));
        productAnalysisModal.show();
    } catch (error) {
        console.error('Error analyzing product:', error);
    }
}
function formatSummary(summary) {
    let formattedSummary = '';

    // Iterate through the summary keys and format the content
    for (const key in summary) {
        if (summary.hasOwnProperty(key)) {
            // Remove stars (*) from both keys and values and format them
            const cleanKey = key.replace(/[*#]+/g, '');
            const cleanValue = summary[key].replace(/[*#]+/g, ''); // Also clean the value from any stars
            formattedSummary += `<strong>${cleanKey}</strong>: ${cleanValue}<br/><br/>`;
        }
    }
    return formattedSummary;
}


// Initialize the application
document.addEventListener('DOMContentLoaded', fetchProducts);
