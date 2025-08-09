/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const productSearch = document.getElementById("productSearch");
let allProducts = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Track selected products by their unique name */
let selectedProducts = [];

/* Utility: Save selected products to localStorage */
function saveSelectedProducts() {
  localStorage.setItem(
    "selectedProducts",
    JSON.stringify(selectedProducts.map((p) => p.name))
  );
}

/* Utility: Load selected products from localStorage */
async function loadSelectedProductsFromStorage() {
  const savedNames = JSON.parse(
    localStorage.getItem("selectedProducts") || "[]"
  );
  if (savedNames.length === 0) return;
  const products = await loadProducts();
  selectedProducts = products.filter((p) => savedNames.includes(p.name));
}

/* Create HTML for displaying product cards with selection logic */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some((p) => p.name === product.name);
      return `
      <div class="product-card${isSelected ? " selected" : ""}" data-name="${
        product.name
      }">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
          <button class="desc-toggle-btn" aria-expanded="false">Show Description</button>
          <div class="product-desc" aria-hidden="true">${
            product.description
          }</div>
        </div>
      </div>
    `;
    })
    .join("");

  // Add click event listeners to each product card for selection
  const cards = document.querySelectorAll(".product-card");
  cards.forEach((card) => {
    card.addEventListener("click", (e) => {
      // Prevent toggle if clicking the description button
      if (e.target.classList.contains("desc-toggle-btn")) return;
      const name = card.getAttribute("data-name");
      loadProducts().then((products) => {
        const product = products.find((p) => p.name === name);
        if (!product) return;
        const alreadySelected = selectedProducts.some((p) => p.name === name);
        if (alreadySelected) {
          selectedProducts = selectedProducts.filter((p) => p.name !== name);
        } else {
          selectedProducts.push(product);
        }
        saveSelectedProducts();
        displayProducts(
          products.filter((p) => p.category === categoryFilter.value)
        );
        updateSelectedProductsList();
      });
    });
  });

  // Add toggle event listeners for description
  const descBtns = document.querySelectorAll(".desc-toggle-btn");
  descBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card selection
      const desc = btn.nextElementSibling;
      const expanded = btn.getAttribute("aria-expanded") === "true";
      if (expanded) {
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "Show Description";
        desc.setAttribute("aria-hidden", "true");
        desc.classList.remove("expanded");
      } else {
        btn.setAttribute("aria-expanded", "true");
        btn.textContent = "Hide Description";
        desc.setAttribute("aria-hidden", "false");
        desc.classList.add("expanded");
      }
    });
  });
}

/* Update the Selected Products section */
function updateSelectedProductsList() {
  const list = document.getElementById("selectedProductsList");
  if (selectedProducts.length === 0) {
    list.innerHTML =
      '<div class="placeholder-message">No products selected</div>';
    return;
  }
  list.innerHTML = selectedProducts
    .map(
      (product) => `
    <div class="selected-product-item">
      ${product.name}
      <button title="Remove" data-name="${product.name}">&times;</button>
    </div>
  `
    )
    .join("");

  // Add remove button listeners
  const removeBtns = list.querySelectorAll("button[data-name]");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-name");
      selectedProducts = selectedProducts.filter((p) => p.name !== name);
      saveSelectedProducts();
      // Update grid and selected list
      loadProducts().then((products) => {
        displayProducts(
          products.filter((p) => p.category === categoryFilter.value)
        );
        updateSelectedProductsList();
      });
    });
  });
}

/* Add Clear All button and line break after Generate Routine button */
const generateBtn = document.getElementById("generateRoutine");
const br = document.createElement("br");
generateBtn.after(br);
const clearAllBtn = document.createElement("button");
clearAllBtn.textContent = "Clear All";
clearAllBtn.className = "clear-all-btn";
generateBtn.parentNode.insertBefore(clearAllBtn, br.nextSibling);
clearAllBtn.addEventListener("click", () => {
  selectedProducts = [];
  saveSelectedProducts();
  loadProducts().then((products) => {
    displayProducts(
      products.filter((p) => p.category === categoryFilter.value)
    );
    updateSelectedProductsList();
  });
});

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

/* Filter and display products by category and search */
function filterAndDisplayProducts() {
  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearch.value.trim().toLowerCase();
  let filtered = allProducts;
  if (selectedCategory) {
    filtered = filtered.filter((p) => p.category === selectedCategory);
  }
  if (searchTerm) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm) ||
        (p.description && p.description.toLowerCase().includes(searchTerm)) ||
        (p.brand && p.brand.toLowerCase().includes(searchTerm))
    );
  }
  displayProducts(filtered);
  updateSelectedProductsList();
}

/* Update product grid when category changes */
categoryFilter.addEventListener("change", filterAndDisplayProducts);

/* Update product grid when search changes */
productSearch.addEventListener("input", filterAndDisplayProducts);

/* DOM elements for chat */
const userInput = document.getElementById("userInput");

/* System prompt to guide the AI assistant */
const SYSTEM_PROMPT =
  "You are a helpful and knowledgeable assistant for L'Oréal. Only answer questions related to L'Oréal products, skincare and haircare routines, beauty recommendations, and how to choose or use L'Oréal items. If a question is unrelated to L'Oréal or its offerings, politely redirect the user to ask a relevant question.";

/* Store conversation history for better context */
let conversationHistory = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

/* Set initial welcome message */
chatWindow.textContent =
  "👋 Hello! I'm your L'Oréal Beauty Assistant. Ask me about skincare routines, makeup tips, or product recommendations!";

/* Function to add messages to the chat window */
function addMessage(message, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("msg");
  if (isUser) {
    messageDiv.classList.add("user");
    messageDiv.textContent = `You: ${message}`;
  } else {
    messageDiv.classList.add("ai");
    messageDiv.innerHTML = `L'Oréal Assistant: `;
  }
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageDiv;
}

/* Function to create typing animation effect */
async function typeMessage(messageDiv, text) {
  const formattedText = text.replace(/\n/g, "<br>");
  let currentText = "";
  for (let i = 0; i < formattedText.length; i++) {
    currentText += formattedText[i];
    messageDiv.innerHTML = `L'Oréal Assistant: ${currentText}`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

/* Function to create typing animation with dots */
async function showTypingAnimation(messageDiv) {
  messageDiv.innerHTML = `L'Oréal Assistant: `;
  const typingDots = ["", ".", "..", "..."];
  let dotIndex = 0;
  for (let i = 0; i < 20; i++) {
    messageDiv.innerHTML = `L'Oréal Assistant: ${typingDots[dotIndex]}`;
    dotIndex = (dotIndex + 1) % typingDots.length;
    await new Promise((resolve) => setTimeout(resolve, 100));
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

/* Function to call OpenAI API via Cloudflare Worker */
async function callOpenAI(userMessage) {
  try {
    conversationHistory.push({
      role: "user",
      content: userMessage,
    });
    const response = await fetch(
      "https://aot-worker.elieboss192.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationHistory,
          max_tokens: 500,
          temperature: 0.4,
          frequency_penalty: 0.8,
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });
    const aiMessageDiv = addMessage("", false);
    await typeMessage(aiMessageDiv, aiResponse);
    return true;
  } catch (error) {
    console.error("Error calling Cloudflare Worker:", error);
    const errorMessageDiv = addMessage("", false);
    await showTypingAnimation(errorMessageDiv);
    await typeMessage(
      errorMessageDiv,
      "Sorry, I'm having trouble connecting right now. Please try again!"
    );
    return false;
  }
}

/* Handle form submission */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;
  addMessage(message, true);
  userInput.value = "";
  const thinkingMessage = document.createElement("div");
  thinkingMessage.classList.add("msg", "ai");
  thinkingMessage.textContent = "L'Oréal Assistant: Thinking...";
  chatWindow.appendChild(thinkingMessage);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  const success = await callOpenAI(message);
  if (thinkingMessage.parentNode) {
    chatWindow.removeChild(thinkingMessage);
  }
});

/* Allow sending message with Enter key */
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    chatForm.dispatchEvent(new Event("submit"));
  }
});

/* Handle Generate Routine button click */
generateBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    addMessage("Please select products before generating a routine.", false);
    return;
  }
  // Prepare product data for the AI
  const productData = selectedProducts.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
  }));
  // Add a message to the conversation for the AI
  const routinePrompt = `Here are the selected L'Oréal products: ${JSON.stringify(
    productData,
    null,
    2
  )}. Please create a personalized beauty routine using these products. Explain the order and how to use each item.`;
  addMessage("Generating your personalized routine...", false);
  // Add the prompt to the conversation history
  conversationHistory.push({ role: "user", content: routinePrompt });
  // Call OpenAI API
  const response = await callOpenAI(routinePrompt);
});

/* On page load, hydrate selected products from localStorage */
window.addEventListener("DOMContentLoaded", async () => {
  await loadSelectedProductsFromStorage();
  await loadProducts();
  filterAndDisplayProducts();
});
