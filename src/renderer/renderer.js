// Global variable for Monaco Editor
let monacoEditor = null;
document.addEventListener('DOMContentLoaded', async () => {
    // Safe element access helper
    const getElement = (id) => {
        const el = document.getElementById(id);
        if (!el) console.warn(`Element not found: #${id}`);
        return el;
    };

    // Show loading state for editor safely
    const editorElement = getElement('editor');
    if (editorElement) editorElement.innerHTML = '<p>Loading editor...</p>';
    
    try {
        // Initialize i18next
        await i18next
            .use(i18nextHttpBackend)
            .use(i18nextBrowserLanguageDetector)
            .init({
                fallbackLng: 'en',
                debug: false,
                backend: {
                    loadPath: '../../locales/{{lng}}/translation.json'
                }
            });

        // Load user language preference
        const settings = await window.electronAPI.getSettings();
        if (settings.language) {
            await i18next.changeLanguage(settings.language);
        }
        
        // Update UI after ensuring elements exist
        setTimeout(updateUI, 0);

        // Safe language switcher setup
        const setupLanguageSwitcher = () => {
            const langEn = getElement('lang-en');
            const langAr = getElement('lang-ar');
            
            if (langEn) {
                langEn.addEventListener('click', async () => {
                    await i18next.changeLanguage('en');
                    await window.electronAPI.setLanguage('en');
                    updateUI();
                });
            }
            
            if (langAr) {
                langAr.addEventListener('click', async () => {
                    await i18next.changeLanguage('ar');
                    await window.electronAPI.setLanguage('ar');
                    document.body.setAttribute('dir', 'rtl');
                    updateUI();
                });
            }

            // Set initial direction for Arabic
            if (i18next.language === 'ar') {
                document.body.setAttribute('dir', 'rtl');
            }
        };
        setupLanguageSwitcher();

        // Initialize Monaco Editor
        await initMonacoEditor();
        if (editorElement) editorElement.innerHTML = ''; // Clear loading message

        // Safe tab switching setup
        const setupTabs = () => {
            const tabs = document.querySelectorAll('.tab-btn');
            if (tabs.length === 0) return;
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.metadata-section').forEach(s => s.classList.remove('active'));
                    
                    tab.classList.add('active');
                    const tabId = tab.getAttribute('data-tab');
                    const tabContent = getElement(`${tabId}-metadata`);
                    if (tabContent) tabContent.classList.add('active');
                });
            });
        };
        setupTabs();

        // File drop zone setup
        const setupDropZone = () => {
            const dropZone = getElement('drop-zone');
            if (!dropZone) return;

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, unhighlight, false);
            });

            function highlight() {
                dropZone.classList.add('highlight');
            }

            function unhighlight() {
                dropZone.classList.remove('highlight');
            }

            dropZone.addEventListener('drop', handleDrop, false);
        };
        setupDropZone();

        // Safe browse button setup
        const browseBtn = getElement('browse-btn');
        if (browseBtn) {
            browseBtn.addEventListener('click', async () => {
                const filePaths = await window.electronAPI.openFileDialog();
                if (filePaths && filePaths.length > 0) {
                    await processFile(filePaths[0]);
                }
            });
        }

        // Add copyright footer
        const footer = document.createElement('div');
        footer.className = 'footer';
        footer.innerHTML = '&copy; 2025 Developed by Firas Arafah - Media Metadata Analyzer';
        document.body.appendChild(footer);

    } catch (error) {
        console.error('Initialization error:', error);
        if (editorElement) {
            editorElement.innerHTML = '<p>Error loading editor. Please refresh.</p>';
        }
    }
});

// Monaco Editor Initialization
async function initMonacoEditor() {
    return new Promise((resolve) => {
        const loaderScript = document.createElement('script');
        loaderScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
        loaderScript.onload = () => {
            require.config({ 
                paths: { 
                    vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' 
                } 
            });

            window.MonacoEnvironment = {
                getWorkerUrl: function (workerId, label) {
                    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
                        self.MonacoEnvironment = {
                            baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/'
                        };
                        importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/base/worker/workerMain.js');
                    `)}`;
                }
            };

            require(['vs/editor/editor.main'], function() {
                monacoEditor = monaco.editor.create(document.getElementById('editor'), {
                    value: '',
                    language: 'json',
                    theme: 'vs',
                    automaticLayout: true,
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'selection',
                    wordWrap: 'on',
                    fontSize: 14,
                    lineNumbers: 'on',
                    folding: true,
                    lineDecorationsWidth: 10
                });
                resolve();
            });
        };
        document.body.appendChild(loaderScript);
    });
}

async function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        const file = files[0];
        if (isMediaFile(file.name)) {
            await processFile(file.path);
        } else {
            alert(i18next.t('errors.invalidFileType'));
        }
    }
}

function isMediaFile(filename) {
    const mediaExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.m4v', '.jpg', '.jpeg', '.png', '.heic'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return mediaExtensions.includes(ext);
}

async function processFile(filePath) {
    try {
        if (!monacoEditor) {
            throw new Error('Editor not initialized');
        }

        // Show file info
        const fileInfo = await getFileInfo(filePath);
        displayFileInfo(fileInfo);

        // Extract metadata
        const result = await window.electronAPI.extractMetadata(filePath);
        if (result.success) {
            displayMetadata(result.metadata);
            monacoEditor.setValue(result.rawMetadata);
            monacoEditor.layout(); // Refresh editor layout
            
            // Display thumbnail if available
            if (result.metadata.thumbnail) {
                const thumbnailContainer = document.getElementById('thumbnail-container');
                const thumbnailImg = document.getElementById('thumbnail');
                thumbnailImg.src = `data:image/jpeg;base64,${result.metadata.thumbnail}`;
                thumbnailContainer.classList.remove('hidden');
            } else {
                document.getElementById('thumbnail-container').classList.add('hidden');
            }
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert(`${i18next.t('errors.metadataExtraction')}: ${error.message}`);
    }
}

async function getFileInfo(filePath) {
    const response = await fetch(filePath);
    const fileBlob = await response.blob();
    
    return {
        name: filePath.split('/').pop().split('\\').pop(),
        size: formatFileSize(fileBlob.size),
        type: fileBlob.type || 'Unknown'
    };
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function displayFileInfo(info) {
    document.getElementById('file-info').classList.remove('hidden');
    document.getElementById('filename').textContent = info.name;
    document.getElementById('filesize').textContent = info.size;
    document.getElementById('filetype').textContent = info.type;
}

function displayMetadata(metadata) {
    // Camera Info
    document.getElementById('make-value').textContent = metadata.Make || metadata.CameraMake || 'N/A';
    document.getElementById('model-value').textContent = metadata.Model || metadata.CameraModel || 'N/A';
    document.getElementById('lens-value').textContent = metadata.LensModel || metadata.Lens || metadata.LensInfo || 'N/A';

    // Media Settings
    document.getElementById('duration-value').textContent = metadata.Duration ? formatDuration(metadata.Duration) : 'N/A';
    document.getElementById('resolution-value').textContent = 
        (metadata.ImageWidth && metadata.ImageHeight) ? `${metadata.ImageWidth}x${metadata.ImageHeight}` :
        (metadata.ExifImageWidth && metadata.ExifImageHeight) ? `${metadata.ExifImageWidth}x${metadata.ExifImageHeight}` : 'N/A';
    document.getElementById('fps-value').textContent = metadata.VideoFrameRate || 'N/A';

    // Camera Settings
    document.getElementById('iso-value').textContent = metadata.ISO || metadata.ISOSpeedRatings || 'N/A';
    document.getElementById('aperture-value').textContent = metadata.ApertureValue ? `f/${metadata.ApertureValue}` : 
        metadata.FNumber ? `f/${metadata.FNumber}` : 'N/A';
    document.getElementById('shutter-speed-value').textContent = metadata.ShutterSpeedValue || metadata.ExposureTime || 'N/A';
    document.getElementById('white-balance-value').textContent = metadata.WhiteBalance || metadata.WhiteBalanceMode || 'N/A';

    // Creation Info
    document.getElementById('creation-date-value').textContent = 
        metadata.CreateDate || metadata.DateTimeOriginal || metadata.ModifyDate || metadata.FileModifyDate || 'N/A';
    document.getElementById('software-value').textContent = metadata.Software || metadata.HandlerType || metadata.ProcessingSoftware || 'N/A';

    // Embedded Files
    const embeddedFilesContainer = document.getElementById('embedded-files');
    embeddedFilesContainer.innerHTML = '';
    
    const embeddedFiles = findEmbeddedReferences(metadata);
    if (embeddedFiles.length > 0) {
        embeddedFiles.forEach(file => {
            const div = document.createElement('div');
            div.className = 'embedded-file';
            div.textContent = file;
            embeddedFilesContainer.appendChild(div);
        });
    } else {
        embeddedFilesContainer.textContent = 'No embedded references found';
    }
}

function formatDuration(duration) {
    if (typeof duration === 'number') {
        const seconds = Math.floor(duration % 60);
        const minutes = Math.floor((duration / 60) % 60);
        const hours = Math.floor(duration / 3600);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return duration;
}

function findEmbeddedReferences(metadata) {
    const references = [];
    const filePatterns = [
        /\.(mp4|mov|avi|mkv|m4v|mp3|wav|aac|aegraphic|aep|prproj|ppj|aepx|aet|plproj|veg|cpr|drp|dsn)/i
    ];

    // Search in all string fields
    for (const [key, value] of Object.entries(metadata)) {
        if (typeof value === 'string') {
            // Check for file paths
            if (value.includes('\\') || value.includes('/')) {
                const matches = value.match(/[^\\\/]+\.\w{2,4}(?=[\\\/]|$)/g);
                if (matches) {
                    matches.forEach(match => {
                        if (filePatterns.some(pattern => pattern.test(match))) {
                            references.push(match);
                        }
                    });
                }
            }

            // Check for file extensions
            if (filePatterns.some(pattern => pattern.test(value))) {
                references.push(value);
            }
        }
    }

    return [...new Set(references)]; // Remove duplicates
}

// Export buttons
document.getElementById('export-json').addEventListener('click', () => exportMetadata('json'));
document.getElementById('export-txt').addEventListener('click', () => exportMetadata('txt'));
document.getElementById('export-csv').addEventListener('click', () => exportMetadata('csv'));

function exportMetadata(format) {
    if (!monacoEditor) {
        alert('Editor is not ready yet');
        return;
    }

    const content = monacoEditor.getValue();
    if (!content) {
        alert(i18next.t('errors.noMetadataToExport'));
        return;
    }

    let blob;
    let filename = `metadata_${new Date().toISOString().slice(0, 10)}`;

    switch (format) {
        case 'json':
            blob = new Blob([content], { type: 'application/json' });
            filename += '.json';
            break;
        case 'txt':
            blob = new Blob([content], { type: 'text/plain' });
            filename += '.txt';
            break;
        case 'csv':
            const csvContent = convertJsonToCsv(JSON.parse(content));
            blob = new Blob([csvContent], { type: 'text/csv' });
            filename += '.csv';
            break;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function convertJsonToCsv(json) {
    const flattenObject = (obj, prefix = '') => {
        return Object.keys(obj).reduce((acc, k) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[k] === 'object' && obj[k] !== null) {
                Object.assign(acc, flattenObject(obj[k], pre + k));
            } else {
                acc[pre + k] = obj[k];
            }
            return acc;
        }, {});
    };

    const flatJson = flattenObject(json);
    const headers = Object.keys(flatJson).join(',');
    const values = Object.values(flatJson)
        .map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v)
        .join(',');

    return `${headers}\n${values}`;
}

// Update the updateUI function to check for element existence
function updateUI() {
    const updateIfExists = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    try {
        updateIfExists('app-title', i18next.t('appTitle'));
        updateIfExists('drop-zone-text', i18next.t('dropZoneText'));
        updateIfExists('browse-btn', i18next.t('browseButton'));
        updateIfExists('file-info-title', i18next.t('fileInfoTitle'));
        updateIfExists('filename-label', i18next.t('filenameLabel'));
        updateIfExists('filesize-label', i18next.t('filesizeLabel'));
        updateIfExists('filetype-label', i18next.t('filetypeLabel'));
        updateIfExists('tab-structured', i18next.t('structuredTab'));
        updateIfExists('tab-raw', i18next.t('rawTab'));
        updateIfExists('camera-info-title', i18next.t('cameraInfoTitle'));
        updateIfExists('make-label', i18next.t('makeLabel'));
        updateIfExists('model-label', i18next.t('modelLabel'));
        updateIfExists('lens-label', i18next.t('lensLabel'));
        updateIfExists('video-settings-title', i18next.t('videoSettingsTitle'));
        updateIfExists('duration-label', i18next.t('durationLabel'));
        updateIfExists('resolution-label', i18next.t('resolutionLabel'));
        updateIfExists('fps-label', i18next.t('fpsLabel'));
        updateIfExists('camera-settings-title', i18next.t('cameraSettingsTitle'));
        updateIfExists('iso-label', i18next.t('isoLabel'));
        updateIfExists('aperture-label', i18next.t('apertureLabel'));
        updateIfExists('shutter-speed-label', i18next.t('shutterSpeedLabel'));
        updateIfExists('white-balance-label', i18next.t('whiteBalanceLabel'));
        updateIfExists('creation-info-title', i18next.t('creationInfoTitle'));
        updateIfExists('creation-date-label', i18next.t('creationDateLabel'));
        updateIfExists('software-label', i18next.t('softwareLabel'));
        updateIfExists('embedded-files-title', i18next.t('embeddedFilesTitle'));
        updateIfExists('export-json', i18next.t('exportJson'));
        updateIfExists('export-txt', i18next.t('exportTxt'));
        updateIfExists('export-csv', i18next.t('exportCsv'));
    } catch (error) {
        console.error('Error updating UI:', error);
    }
}