// ... (Your existing JavaScript code before forcePortraitMode) ...

const orgChartContainer = document.getElementById('orgChartContainer');
const orgChartSVG = document.getElementById('orgChartSVG'); // Get the SVG element

// Define grid size (from Step 15)
const gridSize = 20; // You can adjust this value

// We'll keep track of the active box to know which one to branch from
let activeBox = null;

// Variables to track drag state (from Step 13)
let isDragging = false;
let currentDragBox = null;
let initialMouseX;
let initialMouseY;
let initialBoxX;
let initialBoxY;

// Get references to fixed elements for positioning (from Step 42)
const shortcutMap = document.getElementById('shortcutMap');
const cautionDiv = document.getElementById('caution');
const caution2Div = document.getElementById('caution2'); // Get the new caution2 div

// Function to create a new textbox element (for subsequent boxes: Enter, Tab, Alt+Keys)
function createBox(parentId = null, position = null) {
  const box = document.createElement('textarea');
  box.classList.add('org-chart-box');
  box.placeholder = 'Enter text here...';
  box.style.position = 'absolute';

  const boxId = 'box-' + Date.now() + Math.random().toString(16).slice(2);
  box.id = boxId;

  orgChartContainer.appendChild(box);

  let newBoxX, newBoxY;

  if (parentId) {
    const parentBox = document.getElementById(parentId);
    if (parentBox) {
      const parentLeft = parentBox.offsetLeft;
      const parentTop = parentBox.offsetTop;
      const parentWidth = parentBox.offsetWidth;
      const parentHeight = parentBox.offsetHeight;

      if (position === 'below') {
        newBoxX = parentLeft;
        newBoxY = parentTop + parentHeight + gridSize * 2;
      } else if (position === 'right') {
        newBoxX = parentLeft + parentWidth + gridSize * 3;
        newBoxY = parentTop;
      } else if (position === 'left') {
        newBoxX = parentLeft - box.offsetWidth - gridSize;
        newBoxY = parentTop;
      } else if (position === 'above') {
        newBoxX = parentLeft;
        newBoxY = parentTop - box.offsetHeight - gridSize;
      } else {
        newBoxX = parentLeft;
        newBoxY = parentTop + parentHeight + gridSize * 2;
      }

      const snappedX = Math.round(newBoxX / gridSize) * gridSize;
      const snappedY = Math.round(newBoxY / gridSize) * gridSize;

      box.style.left = snappedX + 'px';
      box.style.top = snappedY + 'px';

      drawLine(parentId, boxId);
    } else {
      console.error('Parent box not found for createBox. Creating as new root.');
      newBoxX = orgChartContainer.offsetWidth / 2 - box.offsetWidth / 2;
      newBoxY = 50;
      const snappedX = Math.round(newBoxX / gridSize) * gridSize;
      const snappedY = Math.round(newBoxY / gridSize) * gridSize;
      box.style.left = snappedX + 'px';
      box.style.top = snappedY + 'px';
    }
  } else {
    box.style.top = (50 / gridSize) * gridSize + 'px';
    box.style.left = (50 / gridSize) * gridSize + 'px';
  }

  box.focus(); // Automatically focus the new box
  resizeContainer(); // Resize container after positioning the box
  return box;
}

// Function to create and position the *very first* box on initial load or reset
function createInitialBox() {
  const existingBoxes = orgChartContainer.querySelectorAll('.org-chart-box');
  existingBoxes.forEach((box) => box.remove());
  const svgElements = Array.from(orgChartSVG.children);
  svgElements.forEach((el) => {
    if (el.tagName !== 'defs') {
      // Keep the <defs> element with the arrowhead marker
      el.remove();
    }
  });

  const box = document.createElement('textarea');
  box.classList.add('org-chart-box');
  box.placeholder = 'Enter text here...';
  box.style.position = 'absolute';

  const boxId = 'box-' + Date.now() + Math.random().toString(16).slice(2);
  box.id = boxId;
  orgChartContainer.appendChild(box);

  box.addEventListener('input', updateDocumentTitle);

  const containerWidth = orgChartContainer.offsetWidth;
  const boxWidth = box.offsetWidth;
  const boxHeight = box.offsetHeight;

  const centerX = containerWidth / 2 - boxWidth / 2;
  const startY = 50;

  const snappedX = Math.round(centerX / gridSize) * gridSize;
  const snappedY = Math.round(startY / gridSize) * gridSize;

  box.style.left = snappedX + 'px';
  box.style.top = snappedY + 'px';

  box.focus();
  activeBox = box;
  resizeContainer();
  updateDocumentTitle();
}

// Function to update the document title based on the first box's content
function updateDocumentTitle() {
  const firstBox = document.querySelector('.org-chart-box');
  let titleContent = 'Organidraw';

  if (firstBox && firstBox.value.trim() !== '') {
    titleContent = firstBox.value.trim() + ' — Organidraw';
  }
  document.title = titleContent;
}

// Helper function to find the closest points between two box rectangles
function findClosestPoints(rect1, rect2) {
  const center1X = rect1.width / 2;
  const center1Y = rect1.height / 2;
  const center2X = rect2.width / 2;
  const center2Y = rect2.height / 2;

  const points1 = [
    { x: center1X, y: 0 },
    { x: rect1.width, y: center1Y },
    { x: center1X, y: rect1.height },
    { x: 0, y: center1Y },
  ];

  const points2 = [
    { x: center2X, y: 0 },
    { x: rect2.width, y: center2Y },
    { x: center2X, y: rect2.height },
    { x: 0, y: center2Y },
  ];

  let minDistance = Infinity;
  let startPoint = { x: 0, y: 0 };
  let endPoint = { x: 0, y: 0 };

  points1.forEach((p1) => {
    points2.forEach((p2) => {
      const containerRect = orgChartContainer.getBoundingClientRect();
      const absP1X = rect1.left + p1.x;
      const absP1Y = rect1.top + p1.y;
      const absP2X = rect2.left + p2.x;
      const absP2Y = rect2.top + p2.y;

      const distance = Math.sqrt(
        Math.pow(absP2X - absP1X, 2) + Math.pow(absP2Y - absP1Y, 2),
      );

      if (distance < minDistance) {
        minDistance = distance;
        startPoint = { x: absP1X - containerRect.left, y: absP1Y - containerRect.top };
        endPoint = { x: absP2X - containerRect.left, y: absP2Y - containerRect.top };
      }
    });
  });

  return { start: startPoint, end: endPoint };
}

// Function to draw a line between two boxes
function drawLine(fromBoxId, toBoxId) {
  const fromBox = document.getElementById(fromBoxId);
  const toBox = document.getElementById(toBoxId);

  if (!fromBox || !toBox) {
    console.error(
      'Cannot draw line: one or both boxes not found. From:',
      fromBoxId,
      'To:',
      toBoxId,
    );
    return;
  }

  const existingLine = orgChartSVG.querySelector(
    `line[data-from="${fromBoxId}"][data-to="${toBoxId}"]`,
  );
  if (existingLine) {
    existingLine.remove();
  }
  const existingLineReverse = orgChartSVG.querySelector(
    `line[data-from="${toBoxId}"][data-to="${fromBoxId}"]`,
  );
  if (existingLineReverse) {
    existingLineReverse.remove();
  }

  const fromRect = fromBox.getBoundingClientRect();
  const toRect = toBox.getBoundingClientRect();

  const { start, end } = findClosestPoints(fromRect, toRect);

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', start.x);
  line.setAttribute('y1', start.y);
  line.setAttribute('x2', end.x);
  line.setAttribute('y2', end.y);
  line.setAttribute('stroke', 'var(--line-color)');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('data-from', fromBoxId);
  line.setAttribute('data-to', toBoxId);

  line.setAttribute('marker-end', 'url(#arrowhead)');

  orgChartSVG.appendChild(line);
}

// Function to update lines when a box moves or is added
function updateLines(boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;

  const connectedLines = orgChartSVG.querySelectorAll(
    `line[data-from="${boxId}"], line[data-to="${boxId}"]`,
  );

  connectedLines.forEach((line) => {
    const fromBoxId = line.getAttribute('data-from');
    const toBoxId = line.getAttribute('data-to');

    const fromBox = document.getElementById(fromBoxId);
    const toBox = document.getElementById(toBoxId);

    if (fromBox && toBox) {
      const fromRect = fromBox.getBoundingClientRect();
      const toRect = toBox.getBoundingClientRect();

      const { start, end } = findClosestPoints(fromRect, toRect);

      line.setAttribute('x1', start.x);
      line.setAttribute('y1', start.y);
      line.setAttribute('x2', end.x);
      line.setAttribute('y2', end.y);
    } else {
      line.remove();
    }
  });
}

// Function to resize the container based on box positions
function resizeContainer() {
  let maxRight = 0;
  let maxBottom = 0;
  let minLeft = Infinity;
  let minTop = Infinity;

  const boxes = orgChartContainer.querySelectorAll('.org-chart-box');

  if (boxes.length === 0) {
    orgChartContainer.style.width = '100%';
    orgChartContainer.style.height = '100vh';
    orgChartSVG.style.width = '100%';
    orgChartSVG.style.height = '100vh';
    return;
  }

  boxes.forEach((box) => {
    const boxLeft = box.offsetLeft;
    const boxTop = box.offsetTop;
    const boxRight = boxLeft + box.offsetWidth;
    const boxBottom = boxTop + box.offsetHeight;

    maxRight = Math.max(maxRight, boxRight);
    maxBottom = Math.max(maxBottom, boxBottom);
    minLeft = Math.min(minLeft, boxLeft);
    minTop = Math.min(minTop, boxTop);
  });

  const padding = 100;

  const requiredWidth = maxRight + padding - Math.min(0, minLeft);
  const requiredHeight = maxBottom + padding - Math.min(0, minTop);

  orgChartContainer.style.width = requiredWidth + 'px';
  orgChartContainer.style.height = requiredHeight + 'px';
  orgChartSVG.style.width = requiredWidth + 'px';
  orgChartSVG.style.height = requiredHeight + 'px';
}

// Function to start dragging (unified for mouse and touch)
function startDrag(event) {
  // Check if the event target is a box or its descendant
  if (
    event.target.classList &&
    event.target.classList.contains('org-chart-box')
  ) {
    isDragging = true;
    currentDragBox = event.target;
    event.preventDefault(); // Prevent default browser behavior (e.g., scrolling on touch)

    currentDragBox.style.zIndex = 100;

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    initialMouseX = clientX;
    initialMouseY = clientY;
    initialBoxX = currentDragBox.offsetLeft;
    initialBoxY = currentDragBox.offsetTop;

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', drag, { passive: false }); // Needs passive:false for preventDefault
    document.addEventListener('touchend', stopDrag);
  }
}

// Function to handle dragging (unified for mouse and touch)
function drag(event) {
  if (!isDragging) return;

  event.preventDefault(); // Prevent default browser behavior (e.g., scrolling)

  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;

  const deltaX = clientX - initialMouseX;
  const deltaY = clientY - initialMouseY;

  const potentialNewBoxX = initialBoxX + deltaX;
  const potentialNewBoxY = initialBoxY + deltaY;

  const snappedX = Math.round(potentialNewBoxX / gridSize) * gridSize;
  const snappedY = Math.round(potentialNewBoxY / gridSize) * gridSize;

  currentDragBox.style.left = snappedX + 'px';
  currentDragBox.style.top = snappedY + 'px';

  updateLines(currentDragBox.id);
}

// Function to stop dragging (unified for mouse and touch)
function stopDrag() {
  if (!isDragging) return;

  isDragging = false;
  if (currentDragBox) {
    currentDragBox.style.zIndex = '';
    resizeContainer();
  }
  currentDragBox = null;

  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchmove', drag);
  document.removeEventListener('touchend', stopDrag);
}

// Add the mousedown and touchstart event listeners to the container using event delegation
orgChartContainer.addEventListener('mousedown', startDrag);
orgChartContainer.addEventListener('touchstart', startDrag, { passive: false }); // Needs passive:false for preventDefault

// Add click listener to the container to handle clicks on boxes
orgChartContainer.addEventListener('click', handleBoxClick);

// Function to handle clicks on organizational chart boxes
function handleBoxClick(event) {
  let targetBox = event.target.closest('.org-chart-box');
  if (targetBox) {
    targetBox.focus();
  }
}

// Get the mode toggle button
const modeToggle = document.getElementById('modeToggle');
modeToggle.addEventListener('click', toggleDarkMode);

// Function to toggle dark mode
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  if (document.body.classList.contains('dark-mode')) {
    localStorage.setItem('mode', 'dark');
  } else {
    localStorage.setItem('mode', 'light');
  }
}

// Get the export button
const exportPdfButton = document.getElementById('exportPdfButton');
exportPdfButton.addEventListener('click', exportChartAsPdf);

// Function to export the organizational chart as PDF
function exportChartAsPdf() {
  const controls = document.getElementById('controls');
  // Temporarily hide controls and fixed elements that shouldn't be in the PDF
  const elementsToHide = [
    controls,
    document.getElementById('isologo'),
    shortcutMap,
    cautionDiv,
    caution2Div,
  ].filter(Boolean); // Filter out nulls if an element doesn't exist

  elementsToHide.forEach((el) => (el.style.display = 'none'));

  const elementToCapture = orgChartContainer;

  html2canvas(elementToCapture, {
    scrollX: -orgChartContainer.scrollLeft,
    scrollY: -orgChartContainer.scrollTop,
    windowWidth: orgChartContainer.scrollWidth,
    windowHeight: orgChartContainer.scrollHeight,
    scale: 2,
    useCORS: true, // If you have images from other domains, e.g., your icons
  }).then((canvas) => {
    const pdf = new window.jspdf.jsPDF('l', 'mm', 'a4'); // 'l' for landscape

    const imgData = canvas.toDataURL('image/png');
    // Calculate aspect ratio to fit image on page
    const imgWidth = pdf.internal.pageSize.getWidth() - 20; // 10mm padding on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const marginX = 10;
    const marginY = 10;

    let currentY = marginY;
    // Check if the image fits on one page, if not, scale down or paginate if necessary
    if (imgHeight > pdf.internal.pageSize.getHeight() - 2 * marginY) {
      // Image is too tall, scale to fit height, adjust width
      const imgHeightAdjusted = pdf.internal.pageSize.getHeight() - 2 * marginY;
      const imgWidthAdjusted = (canvas.width * imgHeightAdjusted) / canvas.height;
      pdf.addImage(imgData, 'PNG', marginX + (imgWidth - imgWidthAdjusted) / 2, marginY, imgWidthAdjusted, imgHeightAdjusted);
    } else {
      pdf.addImage(imgData, 'PNG', marginX, marginY, imgWidth, imgHeight);
    }

    pdf.save('organizational-chart.pdf');

    // Restore visibility of hidden elements
    elementsToHide.forEach((el) => (el.style.display = '')); // Revert to default display
  });
}

// --- File Download/Upload Functionality ---
const downloadFileButton = document.getElementById('downloadFileButton');
const loadFileButton = document.getElementById('loadFileButton');
const uploadFileTrigger = document.getElementById('uploadFileTrigger');

downloadFileButton.addEventListener('click', downloadChartAsFile);
uploadFileTrigger.addEventListener('click', () => loadFileButton.click());
loadFileButton.addEventListener('change', loadChartFromFile);

function getChartData() {
  const nodes = [];
  const edges = [];

  orgChartContainer.querySelectorAll('.org-chart-box').forEach((box) => {
    nodes.push({
      id: box.id,
      x: box.offsetLeft,
      y: box.offsetTop,
      text: box.value,
    });
  });

  orgChartSVG.querySelectorAll('line').forEach((line) => {
    edges.push({
      from: line.getAttribute('data-from'),
      to: line.getAttribute('data-to'),
    });
  });

  return { nodes, edges };
}

function downloadChartAsFile() {
  const data = getChartData();
  const dataStr =
    'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'org-chart.json');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  alert('Chart downloaded!');
}

function loadChartFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!confirm('Load saved chart from file? This will overwrite current chart.')) {
    loadFileButton.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      renderChartFromData(data);
      alert('Chart loaded from file!');
    } catch (error) {
      alert('Error parsing file: ' + error.message);
      console.error('Error parsing file:', error);
    } finally {
      loadFileButton.value = '';
    }
  };
  reader.onerror = (e) => {
    alert('Error reading file: ' + reader.error);
    console.error('Error reading file:', reader.error);
    loadFileButton.value = '';
  };
  reader.readAsText(file);
}

function renderChartFromData(data) {
  resetCanvas(false); // Clear existing canvas without confirmation

  const createdBoxes = {};
  data.nodes.forEach((nodeData) => {
    const box = document.createElement('textarea');
    box.classList.add('org-chart-box');
    box.placeholder = 'Enter text here...';
    box.style.position = 'absolute';
    box.id = nodeData.id;
    box.value = nodeData.text || '';

    orgChartContainer.appendChild(box);

    const snappedX = Math.round(nodeData.x / gridSize) * gridSize;
    const snappedY = Math.round(nodeData.y / gridSize) * gridSize;
    box.style.left = snappedX + 'px';
    box.style.top = snappedY + 'px';

    createdBoxes[nodeData.id] = box;
  });

  data.edges.forEach((edgeData) => {
    if (createdBoxes[edgeData.from] && createdBoxes[edgeData.to]) {
      drawLine(edgeData.from, edgeData.to);
    } else {
      console.warn(
        `Skipping edge: box ID ${edgeData.from} or ${edgeData.to} not found.`,
      );
    }
  });

  orgChartContainer.querySelectorAll('.org-chart-box').forEach((box) => updateLines(box.id));
  resizeContainer();

  const firstBox = document.querySelector('.org-chart-box');
  if (firstBox) {
    firstBox.focus();
  }
  updateDocumentTitle(); // Update title after loading data
}

// --- Reset Canvas Functionality ---
const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', () => resetCanvas(true));

function resetCanvas(requireConfirmation = true) {
  if (requireConfirmation) {
    const confirmReset = confirm(
      'Are you sure you want to reset the canvas? All unsaved changes will be lost.',
    );
    if (!confirmReset) {
      return;
    }
  }
  createInitialBox();
  updateFixedPanelPositions();
}

// --- DELETE BOX FUNCTIONALITY (NEW - from Step 55) ---
function deleteBox(boxToDelete) {
  if (!boxToDelete) return;

  const confirmDelete = confirm(
    'Are you sure you want to delete this box and all its connections? This action cannot be undone.',
  );
  if (!confirmDelete) {
    return; // User cancelled
  }

  const boxIdToDelete = boxToDelete.id;

  // 1. Remove the box from the DOM
  boxToDelete.remove();

  // 2. Remove all lines connected to or from this box
  const linesToDelete = orgChartSVG.querySelectorAll(
    `line[data-from="${boxIdToDelete}"], line[data-to="${boxIdToDelete}"]`,
  );
  linesToDelete.forEach((line) => line.remove());

  // 3. Update activeBox state
  activeBox = null; // No box is currently active

  // 4. Resize the container
  resizeContainer();

  // 5. If no boxes left, create initial box, otherwise focus the first remaining one
  const remainingBoxes = orgChartContainer.querySelectorAll('.org-chart-box');
  if (remainingBoxes.length === 0) {
    createInitialBox(); // This will also handle focusing and title update
  } else {
    remainingBoxes[0].focus(); // Focus the first remaining box
    updateDocumentTitle(); // Update title if first box changed
  }
}

// --- NEW: Handle Orientation Class ---
function handleOrientationChange() {
  if (window.innerHeight > window.innerWidth) {
    document.body.classList.add('portrait-orientation');
  } else {
    document.body.classList.remove('portrait-orientation');
  }
  // Recalculate fixed panel positions after orientation change
  updateFixedPanelPositions();
}

// --- Initial Load Setup ---
window.addEventListener('load', () => {
  const savedMode = localStorage.getItem('mode');
  if (savedMode === 'dark') {
    document.body.classList.add('dark-mode');
  }

  createInitialBox(); // Set up the initial box, focus, and title
  handleOrientationChange(); // Set initial orientation class
  updateFixedPanelPositions(); // Position fixed elements
});

// Also call updateFixedPanelPositions and handleOrientationChange on window resize
window.addEventListener('resize', () => {
  handleOrientationChange();
  updateFixedPanelPositions();
});

// Update activeBox when a box is focused
orgChartContainer.addEventListener('focusin', (event) => {
  if (event.target.classList && event.target.classList.contains('org-chart-box')) {
    activeBox = event.target;
  }
});

// Clear activeBox when focus leaves a box (optional but good practice)
orgChartContainer.addEventListener('focusout', (event) => {
  if (event.target.classList && event.target.classList.contains('org-chart-box')) {
    setTimeout(() => {
      if (!orgChartContainer.contains(document.activeElement)) {
        activeBox = null;
      }
    }, 10);
  }
});

// Function to handle key presses
function handleKeyPress(event) {
  if (event.target.classList && event.target.classList.contains('org-chart-box')) {
    activeBox = event.target;

    // --- Handle Alt + Directional Shortcuts ---
    if (event.altKey) {
      event.preventDefault();

      const currentBox = activeBox;
      const currentBoxLeft = currentBox.offsetLeft;
      const currentBoxTop = currentBox.offsetTop;
      const currentBoxWidth = currentBox.offsetWidth;
      const currentBoxHeight = currentBox.offsetHeight;

      const currentBoxCenterX = currentBoxLeft + currentBoxWidth / 2;
      const currentBoxCenterY = currentBoxTop + currentBoxHeight / 2;

      const allBoxes = Array.from(orgChartContainer.querySelectorAll('.org-chart-box')).filter(
        (box) => box.id !== currentBox.id,
      );

      let targetBox = null;
      let createPosition = null;

      if (event.key === 'e' || event.key === 'E') {
        // Alt + E (Right)
        createPosition = 'right';
        let closestDistance = Infinity;
        allBoxes.forEach((box) => {
          const boxLeft = box.offsetLeft;
          const boxTop = box.offsetTop;
          const boxWidth = box.offsetWidth;
          const boxHeight = box.offsetHeight;

          const boxCenterX = boxLeft + boxWidth / 2;
          const boxCenterY = boxTop + boxHeight / 2;

          if (
            boxCenterX > currentBoxCenterX - 10 &&
            Math.abs(boxCenterY - currentBoxCenterY) < currentBoxHeight
          ) {
            const distance = boxCenterX - currentBoxCenterX;
            if (distance > 0 && distance < closestDistance) {
              closestDistance = distance;
              targetBox = box;
            }
          }
        });
      } else if (event.key === 'q' || event.key === 'Q') {
        // Alt + Q (Left)
        createPosition = 'left';
        let closestDistance = Infinity;
        allBoxes.forEach((box) => {
          const boxLeft = box.offsetLeft;
          const boxTop = box.offsetTop;
          const boxWidth = box.offsetWidth;
          const boxHeight = box.offsetHeight;

          const boxCenterX = boxLeft + boxWidth / 2;
          const boxCenterY = boxTop + boxHeight / 2;

          if (
            boxCenterX < currentBoxCenterX + 10 &&
            Math.abs(boxCenterY - currentBoxCenterY) < currentBoxHeight
          ) {
            const distance = currentBoxCenterX - boxCenterX;
            if (distance > 0 && distance < closestDistance) {
              closestDistance = distance;
              targetBox = box;
            }
          }
        });
      } else if (event.key === 'w' || event.key === 'W') {
        // Alt + W (Up)
        createPosition = 'above';
        let closestDistance = Infinity;
        allBoxes.forEach((box) => {
          const boxLeft = box.offsetLeft;
          const boxTop = box.offsetTop;
          const boxWidth = box.offsetWidth;
          const boxHeight = box.offsetHeight;

          const boxCenterX = boxLeft + boxWidth / 2;
          const boxCenterY = boxTop + boxHeight / 2;

          if (
            boxCenterY < currentBoxCenterY + 10 &&
            Math.abs(boxCenterX - currentBoxCenterX) < currentBoxWidth
          ) {
            const distance = currentBoxCenterY - boxCenterY;
            if (distance > 0 && distance < closestDistance) {
              closestDistance = distance;
              targetBox = box;
            }
          }
        });
      } else if (event.key === 's' || event.key === 'S') {
        // Alt + S (Down)
        createPosition = 'below';
        let closestDistance = Infinity;
        allBoxes.forEach((box) => {
          const boxLeft = box.offsetLeft;
          const boxTop = box.offsetTop;
          const boxWidth = box.offsetWidth;
          const boxHeight = box.offsetHeight;

          const boxCenterX = boxLeft + boxWidth / 2;
          const boxCenterY = boxTop + boxHeight / 2;

          if (
            boxCenterY > currentBoxCenterY - 10 &&
            Math.abs(boxCenterX - currentBoxCenterX) < currentBoxWidth
          ) {
            const distance = boxCenterY - currentBoxCenterY;
            if (distance > 0 && distance < closestDistance) {
              closestDistance = distance;
              targetBox = box;
            }
          }
        });
      }

      if (targetBox) {
        targetBox.focus();
      } else if (createPosition) {
        createBox(currentBox.id, createPosition);
      }
    } else if (event.key === 'Enter' && !event.shiftKey) {
      // Allow Shift+Enter for newline
      event.preventDefault();
      if (activeBox) {
        createBox(activeBox.id, 'below');
      }
    } else if (event.key === 'Tab') {
      event.preventDefault();
      if (activeBox) {
        createBox(activeBox.id, 'right');
      }
    } else if (event.ctrlKey && event.key === 'Backspace') {
      // Ctrl + Backspace key to delete
      event.preventDefault();
      if (activeBox) {
        deleteBox(activeBox);
      }
    }
  } else {
    if (event.altKey && (event.key === 's' || event.key === 'S')) {
      event.preventDefault();
      const firstBox = orgChartContainer.querySelector('.org-chart-box');
      if (firstBox) {
        firstBox.focus();
      } else {
        createInitialBox(); // If no boxes at all, create one
      }
    }
  }
}

// Add the keydown event listener to the document
document.addEventListener('keydown', handleKeyPress);

// Function to update the positions of fixed bottom-right panels
function updateFixedPanelPositions() {
  if (!shortcutMap || !cautionDiv || !caution2Div) {
    // Ensure all elements exist
    console.warn('Fixed panels not found, skipping position update.');
    return;
  }

  // Get current display styles to determine if they are visible via CSS media queries
  const isShortcutMapVisible = window.getComputedStyle(shortcutMap).display !== 'none';
  const isCautionDivVisible = window.getComputedStyle(cautionDiv).display !== 'none';
  const isCaution2DivVisible = window.getComputedStyle(caution2Div).display !== 'none';

  // Apply default bottom/right and then adjust if visible
  let currentBottomOffset = 20; // Starting point from the very bottom of the viewport

  // Position shortcutMap
  if (isShortcutMapVisible) {
    shortcutMap.style.bottom = currentBottomOffset + 'px';
    shortcutMap.style.right = '20px';
    // Add its height + spacing for the next element
    currentBottomOffset += shortcutMap.offsetHeight + 20;
    shortcutMap.style.display = 'block'; // Ensure it's explicitly shown if it was hidden by JS for PDF export
  } else {
    shortcutMap.style.display = 'none';
  }

  // Position caution div (the first one)
  if (isCautionDivVisible) {
    cautionDiv.style.bottom = currentBottomOffset + 'px';
    cautionDiv.style.right = '20px';
    currentBottomOffset += cautionDiv.offsetHeight + 20;
    cautionDiv.style.display = 'block';
  } else {
    cautionDiv.style.display = 'none';
  }

  // Position caution2 div
  if (isCaution2DivVisible) {
    caution2Div.style.bottom = currentBottomOffset + 'px';
    caution2Div.style.right = '20px';
    // No need to update currentBottomOffset further if this is the last element
    caution2Div.style.display = 'block';
  } else {
    caution2Div.style.display = 'none';
  }
}