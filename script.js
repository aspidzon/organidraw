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


// Function to create a new textbox element
// This function is primarily for creating *new* boxes based on user input (Enter, Tab, Alt+Keys)
// It expects a parentId and position to determine where to place the new box and draw a line.
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
                // Default position if parentId is provided but position is null or unknown
                newBoxX = parentLeft;
                newBoxY = parentTop + parentHeight + gridSize * 2;
            }

            const snappedX = Math.round(newBoxX / gridSize) * gridSize;
            const snappedY = Math.round(newBoxY / gridSize) * gridSize;

            box.style.left = snappedX + 'px';
            box.style.top = snappedY + 'px';

            drawLine(parentId, boxId); // Draw line back to the parent that triggered creation

        } else {
            console.error("Parent box not found for createBox. Creating as new root.");
            // Fallback for missing parent: create as a new, initial-like box (centered)
            newBoxX = (orgChartContainer.offsetWidth / 2) - (box.offsetWidth / 2);
            newBoxY = 50;
            const snappedX = Math.round(newBoxX / gridSize) * gridSize;
            const snappedY = Math.round(newBoxY / gridSize) * gridSize;
            box.style.left = snappedX + 'px';
            box.style.top = snappedY + 'px';
        }
    } else {
        // This path is for a box created without a parent.
        // For the *very first* box on load/reset, `createInitialBox` is used.
        // This acts as a fallback for 'new root' box creation if createBox is called directly without a parent.
        box.style.top = (50 / gridSize) * gridSize + 'px';
        box.style.left = (50 / gridSize) * gridSize + 'px';
    }

    box.focus(); // Automatically focus the new box
    resizeContainer(); // Resize container after positioning the box
    return box;
}

// Function to create and position the *very first* box on initial load or reset
// This ensures it's properly centered and is the only box initially.
function createInitialBox() {
    // Clear existing boxes and lines (this is part of its "initial" setup role)
    const existingBoxes = orgChartContainer.querySelectorAll('.org-chart-box');
    existingBoxes.forEach(box => box.remove());
    const svgElements = Array.from(orgChartSVG.children);
    svgElements.forEach(el => {
        if (el.tagName !== 'defs') { // Keep the <defs> element with the arrowhead marker
            el.remove();
        }
    });

    // Create the new box element
    const box = document.createElement('textarea');
    box.classList.add('org-chart-box');
    box.placeholder = 'Enter text here...';
    box.style.position = 'absolute';

    const boxId = 'box-' + Date.now() + Math.random().toString(16).slice(2);
    box.id = boxId;
    orgChartContainer.appendChild(box); // Add to DOM first to get dimensions

    // Calculate centering (use current container and box dimensions)
    const containerWidth = orgChartContainer.offsetWidth; // Gets computed width including padding
    const boxWidth = box.offsetWidth;
    const boxHeight = box.offsetHeight;

    const centerX = (containerWidth / 2) - (boxWidth / 2);
    const startY = 50; // Fixed vertical offset from top

    const snappedX = Math.round(centerX / gridSize) * gridSize;
    const snappedY = Math.round(startY / gridSize) * gridSize;

    box.style.left = snappedX + 'px';
    box.style.top = snappedY + 'px';

    box.focus(); // Focus the newly created first box
    resizeContainer(); // Ensure container resizes to fit it
    activeBox = box; // Set this as the active box for keyboard commands
}


// Helper function to find the closest points between two box rectangles (from Step 29)
function findClosestPoints(rect1, rect2) {
    const center1X = rect1.width / 2;
    const center1Y = rect1.height / 2;
    const center2X = rect2.width / 2;
    const center2Y = rect2.height / 2;

    const points1 = [
        { x: center1X, y: 0 },             // Top center
        { x: rect1.width, y: center1Y },   // Right center
        { x: center1X, y: rect1.height },  // Bottom center
        { x: 0, y: center1Y }              // Left center
    ];

    const points2 = [
        { x: center2X, y: 0 },             // Top center
        { x: rect2.width, y: center2Y },   // Right center
        { x: center2X, y: rect2.height },  // Bottom center
        { x: 0, y: center2Y }              // Left center
    ];

    let minDistance = Infinity;
    let startPoint = { x: 0, y: 0 };
    let endPoint = { x: 0, y: 0 };

    points1.forEach(p1 => {
        points2.forEach(p2 => {
            const containerRect = orgChartContainer.getBoundingClientRect(); // Get current container position
            const absP1X = rect1.left + p1.x; // Absolute position of point 1
            const absP1Y = rect1.top + p1.y;
            const absP2X = rect2.left + p2.x; // Absolute position of point 2
            const absP2Y = rect2.top + p2.y;

            const distance = Math.sqrt(Math.pow(absP2X - absP1X, 2) + Math.pow(absP2Y - absP1Y, 2));

            if (distance < minDistance) {
                minDistance = distance;
                // Store points relative to container's top-left for SVG
                startPoint = { x: absP1X - containerRect.left, y: absP1Y - containerRect.top };
                endPoint = { x: absP2X - containerRect.left, y: absP2Y - containerRect.top };
            }
        });
    });

    return { start: startPoint, end: endPoint };
}

// Function to draw a line between two boxes (from Step 11, updated in Step 29 and previous fixes)
function drawLine(fromBoxId, toBoxId) {
    const fromBox = document.getElementById(fromBoxId);
    const toBox = document.getElementById(toBoxId);

    if (!fromBox || !toBox) {
        console.error("Cannot draw line: one or both boxes not found. From:", fromBoxId, "To:", toBoxId);
        return;
    }

    // Remove any existing line between these two boxes before drawing a new one.
    const existingLine = orgChartSVG.querySelector(`line[data-from="${fromBoxId}"][data-to="${toBoxId}"]`);
    if (existingLine) {
        existingLine.remove();
    }
    const existingLineReverse = orgChartSVG.querySelector(`line[data-from="${toBoxId}"][data-to="${fromBoxId}"]`);
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

    line.setAttribute('marker-end', 'url(#arrowhead)'); // Add arrowhead

    orgChartSVG.appendChild(line);
}

// Function to update lines when a box moves or is added (from Step 13, updated in Step 29 and previous fixes)
function updateLines(boxId) {
    const box = document.getElementById(boxId);
    if (!box) return;

    // Find all lines connected to this box (either as 'data-from' or 'data-to')
    const connectedLines = orgChartSVG.querySelectorAll(`line[data-from="${boxId}"], line[data-to="${boxId}"]`);

    connectedLines.forEach(line => {
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
            line.remove(); // If a connected box is missing, remove the line
        }
    });
}

// Function to resize the container based on box positions (from Step 17, updated in Step 26 and previous fixes)
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

    boxes.forEach(box => {
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

// Function to start dragging (from Step 13, updated in previous fixes)
function startDrag(event) {
    if (event.target.classList && event.target.classList.contains('org-chart-box')) {
        isDragging = true;
        currentDragBox = event.target;
        event.preventDefault(); // Prevent text selection when starting drag

        currentDragBox.style.zIndex = 100; // Bring dragged box to front

        initialMouseX = event.clientX;
        initialMouseY = event.clientY;
        initialBoxX = currentDragBox.offsetLeft;
        initialBoxY = currentDragBox.offsetTop;

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    }
}

// Function to handle dragging (from Step 13, updated in Step 15)
function drag(event) {
    if (!isDragging) return;

    event.preventDefault();

    const deltaX = event.clientX - initialMouseX;
    const deltaY = event.clientY - initialMouseY;

    const potentialNewBoxX = initialBoxX + deltaX;
    const potentialNewBoxY = initialBoxY + deltaY;

    const snappedX = Math.round(potentialNewBoxX / gridSize) * gridSize;
    const snappedY = Math.round(potentialNewBoxY / gridSize) * gridSize;

    currentDragBox.style.left = snappedX + 'px';
    currentDragBox.style.top = snappedY + 'px';

    updateLines(currentDragBox.id);
}

// Function to stop dragging (from Step 13, updated in Step 17)
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
}

// Add the mousedown event listener to the container using event delegation (from Step 13)
orgChartContainer.addEventListener('mousedown', startDrag);


// Get the mode toggle button (from Step 24)
const modeToggle = document.getElementById('modeToggle');
modeToggle.addEventListener('click', toggleDarkMode);

// Function to toggle dark mode (from Step 24)
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('mode', 'dark');
    } else {
        localStorage.setItem('mode', 'light');
    }
}

// Get the export button (from Step 19)
const exportPdfButton = document.getElementById('exportPdfButton');
exportPdfButton.addEventListener('click', exportChartAsPdf);

// Function to export the organizational chart as PDF (from Step 19, updated in Step 24)
function exportChartAsPdf() {
    const controls = document.getElementById('controls');
    controls.style.display = 'none';

    const elementToCapture = orgChartContainer;

    html2canvas(elementToCapture, {
        scrollX: -orgChartContainer.scrollLeft,
        scrollY: -orgChartContainer.scrollTop,
        windowWidth: orgChartContainer.scrollWidth,
        windowHeight: orgChartContainer.scrollHeight,
        scale: 2
    }).then(canvas => {
        const pdf = new window.jspdf.jsPDF('l', 'mm', 'a4');

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 280;
        const imgHeight = canvas.height * imgWidth / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        pdf.save('organizational-chart.pdf');

        controls.style.display = 'flex';
    });
}

// --- File Download/Upload Functionality (from Step 40) ---
const downloadFileButton = document.getElementById('downloadFileButton');
const loadFileButton = document.getElementById('loadFileButton');
const uploadFileTrigger = document.getElementById('uploadFileTrigger');

downloadFileButton.addEventListener('click', downloadChartAsFile);
uploadFileTrigger.addEventListener('click', () => loadFileButton.click());
loadFileButton.addEventListener('change', loadChartFromFile);

function getChartData() {
    const nodes = [];
    const edges = [];

    orgChartContainer.querySelectorAll('.org-chart-box').forEach(box => {
        nodes.push({
            id: box.id,
            x: box.offsetLeft,
            y: box.offsetTop,
            text: box.value
        });
    });

    orgChartSVG.querySelectorAll('line').forEach(line => {
        edges.push({
            from: line.getAttribute('data-from'),
            to: line.getAttribute('data-to')
        });
    });

    return { nodes, edges };
}

function downloadChartAsFile() {
    const data = getChartData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "org-chart.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    alert('Chart downloaded!');
}

function loadChartFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm("Load saved chart from file? This will overwrite current chart.")) {
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
    data.nodes.forEach(nodeData => {
        const box = document.createElement('textarea');
        box.classList.add('org-chart-box');
        box.placeholder = 'Enter text here...';
        box.style.position = 'absolute';
        box.id = nodeData.id; // Assign the saved ID
        box.value = nodeData.text || '';

        orgChartContainer.appendChild(box);

        const snappedX = Math.round(nodeData.x / gridSize) * gridSize;
        const snappedY = Math.round(nodeData.y / gridSize) * gridSize;
        box.style.left = snappedX + 'px';
        box.style.top = snappedY + 'px';

        createdBoxes[nodeData.id] = box;
    });

    data.edges.forEach(edgeData => {
        if (createdBoxes[edgeData.from] && createdBoxes[edgeData.to]) {
            drawLine(edgeData.from, edgeData.to);
        } else {
            console.warn(`Skipping edge: box ID ${edgeData.from} or ${edgeData.to} not found.`);
        }
    });

    // Update lines for all boxes (important after mass creation/repositioning)
    orgChartContainer.querySelectorAll('.org-chart-box').forEach(box => updateLines(box.id));
    resizeContainer();

    const firstBox = document.querySelector('.org-chart-box');
    if (firstBox) {
        firstBox.focus();
    }
}

// --- Reset Canvas Functionality (from Step 38) ---
const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', () => resetCanvas(true)); // Explicitly require confirmation

// This function now acts as a wrapper that calls createInitialBox
// to set up a new, clean canvas.
function resetCanvas(requireConfirmation = true) {
    if (requireConfirmation) {
        const confirmReset = confirm("Are you sure you want to reset the canvas? All unsaved changes will be lost.");
        if (!confirmReset) {
            return;
        }
    }
    // createInitialBox will handle clearing previous elements and setting up a new box.
    createInitialBox();
    // After reset/initial create, also update fixed panels
    updateFixedPanelPositions();
}


// --- Initial Load Setup (from Step 7, updated multiple times) ---
window.addEventListener('load', () => {
    // Check for saved mode preference first
    const savedMode = localStorage.getItem('mode');
    if (savedMode === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Always start with a fresh initial box when the page loads
    createInitialBox();
    // After initial setup, also call updateFixedPanelPositions for correct layout
    updateFixedPanelPositions();
});

// Also call updateFixedPanelPositions on window resize (from Step 42)
window.addEventListener('resize', updateFixedPanelPositions);


// Update activeBox when a box is focused (from Step 7)
orgChartContainer.addEventListener('focusin', (event) => {
    if (event.target.classList && event.target.classList.contains('org-chart-box')) {
        activeBox = event.target;
    }
});

// Clear activeBox when focus leaves a box (optional but good practice) (from Step 7)
orgChartContainer.addEventListener('focusout', (event) => {
    if (event.target.classList && event.target.classList.contains('org-chart-box')) {
        setTimeout(() => {
            if (!orgChartContainer.contains(document.activeElement)) {
                activeBox = null;
            }
        }, 10);
    }
});

// Function to handle key presses (from Step 7, updated throughout steps)
function handleKeyPress(event) {
    if (event.target.classList && event.target.classList.contains('org-chart-box')) {
        activeBox = event.target;

        // --- Handle Alt + Directional Shortcuts (from Step 27) ---
        if (event.altKey) {
            event.preventDefault();

            const currentBox = activeBox;
            const currentBoxLeft = currentBox.offsetLeft;
            const currentBoxTop = currentBox.offsetTop;
            const currentBoxWidth = currentBox.offsetWidth;
            const currentBoxHeight = currentBox.offsetHeight;

            const currentBoxCenterX = currentBoxLeft + currentBoxWidth / 2;
            const currentBoxCenterY = currentBoxTop + currentBoxHeight / 2;

            const allBoxes = Array.from(orgChartContainer.querySelectorAll('.org-chart-box')).filter(box => box.id !== currentBox.id);

            let targetBox = null;
            let createPosition = null;

            if (event.key === 'e' || event.key === 'E') { // Alt + E (Right)
                 createPosition = 'right';
                 let closestDistance = Infinity;
                 allBoxes.forEach(box => {
                     const boxLeft = box.offsetLeft;
                     const boxTop = box.offsetTop;
                     const boxWidth = box.offsetWidth;
                     const boxHeight = box.offsetHeight;

                     const boxCenterX = boxLeft + boxWidth / 2;
                     const boxCenterY = boxTop + boxHeight / 2;

                     if (boxCenterX > currentBoxCenterX - 10 &&
                         Math.abs(boxCenterY - currentBoxCenterY) < currentBoxHeight) {
                         const distance = boxCenterX - currentBoxCenterX;
                         if (distance > 0 && distance < closestDistance) {
                              closestDistance = distance;
                              targetBox = box;
                         }
                     }
                 });

            } else if (event.key === 'q' || event.key === 'Q') { // Alt + Q (Left)
                 createPosition = 'left';
                 let closestDistance = Infinity;
                  allBoxes.forEach(box => {
                     const boxLeft = box.offsetLeft;
                     const boxTop = box.offsetTop;
                     const boxWidth = box.offsetWidth;
                     const boxHeight = box.offsetHeight;

                     const boxCenterX = boxLeft + boxWidth / 2;
                     const boxCenterY = boxTop + boxHeight / 2;

                      if (boxCenterX < currentBoxCenterX + 10 &&
                         Math.abs(boxCenterY - currentBoxCenterY) < currentBoxHeight) {
                         const distance = currentBoxCenterX - boxCenterX;
                         if (distance > 0 && distance < closestDistance) {
                              closestDistance = distance;
                              targetBox = box;
                         }
                     }
                 });

            } else if (event.key === 'w' || event.key === 'W') { // Alt + W (Up)
                 createPosition = 'above';
                 let closestDistance = Infinity;
                  allBoxes.forEach(box => {
                     const boxLeft = box.offsetLeft;
                     const boxTop = box.offsetTop;
                     const boxWidth = box.offsetWidth;
                     const boxHeight = box.offsetHeight;

                     const boxCenterX = boxLeft + boxWidth / 2;
                     const boxCenterY = boxTop + boxHeight / 2;

                      if (boxCenterY < currentBoxCenterY + 10 &&
                          Math.abs(boxCenterX - currentBoxCenterX) < currentBoxWidth) {
                          const distance = currentBoxCenterY - boxCenterY;
                          if (distance > 0 && distance < closestDistance) {
                              closestDistance = distance;
                              targetBox = box;
                          }
                      }
                 });

            } else if (event.key === 's' || event.key === 'S') { // Alt + S (Down)
                 createPosition = 'below';
                 let closestDistance = Infinity;
                  allBoxes.forEach(box => {
                     const boxLeft = box.offsetLeft;
                     const boxTop = box.offsetTop;
                     const boxWidth = box.offsetWidth;
                     const boxHeight = box.offsetHeight;

                     const boxCenterX = boxLeft + boxWidth / 2;
                     const boxCenterY = boxTop + boxHeight / 2;

                      if (boxCenterY > currentBoxCenterY - 10 &&
                          Math.abs(boxCenterX - currentBoxCenterX) < currentBoxWidth) {
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

        } else if (event.key === 'Enter' && !event.shiftKey) { // Allow Shift+Enter for newline
            event.preventDefault();
            if (activeBox) {
                createBox(activeBox.id, 'below');
            }
        } else if (event.key === 'Tab') {
            event.preventDefault();
            if (activeBox) {
                createBox(activeBox.id, 'right');
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

// Function to update the positions of fixed bottom-right panels (from Step 42)
function updateFixedPanelPositions() {
    // Check if elements exist before trying to position them
    if (!shortcutMap || !cautionDiv) {
        console.warn("Fixed panels not found, skipping position update.");
        return;
    }

    // Position shortcutMap (its bottom is fixed in CSS to 20px, only need its height)
    const shortcutMapHeight = shortcutMap.offsetHeight;
    const spacing = 20; // Desired spacing between panels

    // Calculate caution's bottom position based on shortcutMap's position and height
    // bottom of caution = bottom of shortcutMap (20px) + shortcutMap's height + spacing
    cautionDiv.style.bottom = (20 + shortcutMapHeight + spacing) + 'px';

    // Ensure display property is explicitly set, in case it was toggled by another function
    shortcutMap.style.display = 'block';
    cautionDiv.style.display = 'block';
}