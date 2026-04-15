import OBR from "https://esm.sh/@owlbear-rodeo/sdk";

let isSortedAZ = false;
let draggedItemIndex = null;

// UI Elements
const appContainer = document.querySelector('.app-container');
const addBtn = document.getElementById('add-btn');
const addForm = document.getElementById('add-form');
const cancelAddBtn = document.getElementById('cancel-add-btn');
const saveAssetBtn = document.getElementById('save-asset-btn');
const sortBtn = document.getElementById('sort-btn');
const searchInput = document.getElementById('search-input');
const assetList = document.getElementById('asset-list');

// Inputs
const nameInput = document.getElementById('asset-name');
const urlInput = document.getElementById('asset-url');
const typeInput = document.getElementById('asset-type');

// Initialize Extension
OBR.onReady(async () => {
  const role = await OBR.player.getRole();
  if (role !== "GM") {
    appContainer.innerHTML = `
      <div class="glass-panel" style="text-align:center; padding: 20px; color: var(--danger);">
        <strong>Access Denied</strong><br>
        This file manager is only available to the Game Master.
      </div>
    `;
    return;
  }
  
  renderAssets();
});

// Storage Logic
function getStorageKey() {
  const playerId = OBR.player.id;
  const roomId = OBR.room.id;
  return `gm_assets_${playerId}_${roomId}`;
}

function getAssets() {
  const key = getStorageKey();
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveAssets(assets) {
  const key = getStorageKey();
  localStorage.setItem(key, JSON.stringify(assets));
}

// Render Logic
function renderAssets() {
  let assets = getAssets();
  const query = searchInput.value.toLowerCase();
  
  // Filtering
  if (query) {
    assets = assets.filter(a => a.name.toLowerCase().includes(query));
  }
  
  // Sorting
  // We keep the original index array to map back correctly for reordering regardless of sort/filter
  let displayAssets = assets.map((a, i) => ({ ...a, originalIndex: i }));
  
  if (isSortedAZ) {
    displayAssets.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  assetList.innerHTML = '';
  
  if (displayAssets.length === 0) {
    assetList.innerHTML = `<div style="text-align:center; padding:10px; color:var(--text-secondary); font-size:0.85rem;">No assets found.</div>`;
    return;
  }

  displayAssets.forEach((asset, displayIndex) => {
    const li = document.createElement('li');
    li.className = 'asset-item';
    li.draggable = !isSortedAZ && !query; // Only allow drag if not sorted/filtered
    li.dataset.index = asset.originalIndex;
    
    // Icon based on type
    const isMap = asset.type === 'MAP';
    const iconSvg = isMap 
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="10" r="3"></circle><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path></svg>`;

    li.innerHTML = `
      <div class="asset-drag-handle" title="Drag to reorder (Disable Sort/Search first)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
      </div>
      <img src="${asset.url}" class="asset-thumb" alt="Thumb" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iIzIyMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIi8+PC9zdmc+'" />
      <div class="asset-info">
        <div class="asset-name" title="${asset.name}">${asset.name}</div>
        <div class="asset-type">${iconSvg} ${asset.type}</div>
      </div>
      <div class="asset-actions">
        <button class="btn-icon open-btn" title="Open on Table">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </button>
        <button class="btn-danger delete-btn" title="Delete Asset">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;

    // Events
    if(!isSortedAZ && !query) {
      li.addEventListener('dragstart', handleDragStart);
      li.addEventListener('dragover', handleDragOver);
      li.addEventListener('dragleave', handleDragLeave);
      li.addEventListener('drop', handleDrop);
    }
    
    li.querySelector('.open-btn').addEventListener('click', () => openOnTable(asset));
    li.querySelector('.delete-btn').addEventListener('click', () => deleteAsset(asset.originalIndex));

    assetList.appendChild(li);
  });
}

// Drag and Drop implementation for Custom Order
function handleDragStart(e) {
  draggedItemIndex = parseInt(e.currentTarget.dataset.index, 10);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedItemIndex);
  setTimeout(() => e.target.style.opacity = '0.5', 0);
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  const targetIndex = parseInt(e.currentTarget.dataset.index, 10);
  const sourceIndex = draggedItemIndex;
  
  e.currentTarget.style.opacity = '1';
  
  if (sourceIndex === targetIndex || sourceIndex === null) return;
  
  let assets = getAssets();
  const [removed] = assets.splice(sourceIndex, 1);
  assets.splice(targetIndex, 0, removed);
  
  saveAssets(assets);
  renderAssets();
}

// Add/Edit/Delete
function deleteAsset(index) {
  if(!confirm("Remove this asset from your manager?")) return;
  const assets = getAssets();
  assets.splice(index, 1);
  saveAssets(assets);
  renderAssets();
}

addBtn.addEventListener('click', () => {
  addForm.classList.remove('hidden');
});

cancelAddBtn.addEventListener('click', () => {
  addForm.classList.add('hidden');
  nameInput.value = '';
  urlInput.value = '';
});

saveAssetBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  const type = typeInput.value;
  
  if (!name || !url) return;
  
  const assets = getAssets();
  assets.push({ name, url, type });
  saveAssets(assets);
  
  addForm.classList.add('hidden');
  nameInput.value = '';
  urlInput.value = '';
  renderAssets();
});

// Search & Sort
searchInput.addEventListener('input', () => {
  renderAssets();
});

sortBtn.addEventListener('click', () => {
  isSortedAZ = !isSortedAZ;
  sortBtn.classList.toggle('active', isSortedAZ);
  renderAssets();
});

// OBR Table Spawning
async function openOnTable(asset) {
  // Pre-load image to get dimensions
  const img = new Image();
  img.onload = async () => {
    const width = img.width || 500;
    const height = img.height || 500;
    
    // Setup dimensions depending on grid if available? 
    // Usually maps are big, tokens are smaller. Let's just pass dimensions and let OBR handle scale, or we scale it standard.
    // OBR standard: 1 grid cell = 150px. 
    // For tokens, scale down if larger than 300px?
    
    // Determine mime extension
    let mimeStr = "image/png";
    if(asset.url.toLowerCase().endsWith(".webp")) mimeStr = "image/webp";
    if(asset.url.toLowerCase().endsWith(".jpg") || asset.url.toLowerCase().endsWith(".jpeg")) mimeStr = "image/jpeg";
    
    const imageObject = {
      width,
      height,
      mime: mimeStr,
      url: asset.url
    };

    let item;
    if (asset.type === "MAP") {
      item = OBR.buildImage(imageObject)
        .layer("MAP")
        .position({ x: width / 2, y: height / 2 })
        .build();
    } else {
      item = OBR.buildImage(imageObject)
        .layer(asset.type) // TOKEN, PROP, MOUNT
        .position({ x: width / 2, y: height / 2 })
        .build();
    }
    
    await OBR.scene.items.addItems([item]);
    
    // Provide feedback (notifying user via OBR notification if we want)
    await OBR.notification.show(`${asset.name} deployed to table!`);
  };
  
  img.onerror = () => {
    OBR.notification.show(`Failed to load image from URL: ${asset.url}`);
  };
  
  img.src = asset.url;
}
