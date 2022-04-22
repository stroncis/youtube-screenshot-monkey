// ==UserScript==
// @name         Youtube frame capture
// @namespace    https://github.com/stroncis
// @version      0.1
// @description  Captures current frame of the video and lets to disable any UI elements that overlay video.
// @author       Martynas Shnaresys
// @match        https://*.youtube.com/watch*
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @license      MIT
// ==/UserScript==

let currentPage = location.href;

/**
 * Launches grabber.
 * Key '[' grabs full frame.
 * Key ']' grabs actual frame size.
 * Key 'p' or 'P' toggles video controls visibility.
 * Keypresses ignored if focused to input fields.
 */
const logKey = (e) => {
    const searchInputField = document.querySelector('input#search');
    const commentInputField = document.querySelector('div#contenteditable-root');
    const isInSearchField = searchInputField === document.activeElement;
    const isInCommentField = commentInputField === document.activeElement;
    const isInInputField = isInSearchField || isInCommentField;
    // const keyP = e.key === 'p' || e.key === 'P';
    // const fullFrameSize = e.shiftKey ? false : true;
    if (isInInputField) return null;
    if ((e.key === 'p' || e.key === 'P')) toggleUIVisibility();
    if (e.key === '[') getScreenshotImage();
    if (e.key === ']') getScreenshotImage(true);
    return null;
};


/**
 * Toggles Youtube video control and vignette visibility.
 *
 * @param {boolean} restore - if true, UI elements visibility is restored
 *
 */
const toggleUIVisibility = (restore) => {
    const identificators = [
        '.ytp-gradient-top',
        '.ytp-gradient-bottom',
        '.ytp-chrome-top',
        '.ytp-chrome-bottom',
        '.ytp-ce-video',
        '.ytp-ce-channel'
    ];
    const elements = identificators.map(id => document.querySelector(`${id}`));
    const invisible = elements[0].style.display;
    const state = invisible || restore ? '' : 'none';
    elements.forEach((element) => { element.style.display = state; });
};


/**
 * Destroys the strip.
 * YEPP 👉 ☠ 👉 ⚰ 👉 🕊
 * no worries, we, stardust children, are testament of things reborn
 */
const destroyStrip = () => {
    const screenshotStrip = document.querySelector('#screenshot-strip');
    if (!screenshotStrip) return;
    screenshotStrip.remove();
};


/**
 * Destroy the strip on url change (SPA specific) and restore UI visibility.
 * Prevents from transfering captured frames to a "new" video container.
 */
const restoreDefaults = () => {
    if (currentPage !== location.href) {
        currentPage = location.href;
        destroyStrip();
        toggleUIVisibility(true);
    }
};


/**
 * @typedef {Object} Frame
 * @property {Canvas} frame.canvas image with frame data
 * @property {number} frame.width Width of window
 * @property {number} frame.height Height of window
 * @property {number} frame.time Frame position represented in seconds with fractions of seconds
 */

/**
 * Captures a image frame from the provided video element.
 *
 * @param {Video} videoStream HTML5 video element to grab the image frame from
 * @param {boolean | undefined} isResized - if true, frame is resized to DOM element's dimensions
 *
 * @return {Frame} Frame data with it's meta
 */
const captureFrame = (videoStream, isResized) => {
    const { videoWidth, videoHeight, clientWidth, currentTime: time } = videoStream;
    const getResizedHeight = () => Math.round(videoHeight * clientWidth / videoWidth);
    const width = isResized ? clientWidth : videoWidth;
    const height = isResized ? getResizedHeight() : videoHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoStream, 0, 0, width, height);

    return {
        canvas,
        width,
        height,
        time,
    };
};


/**
 * Converts seconds into hh:mm:ss format
 *
 * @param {number} seconds interval expressed in seconds
 *
 * @return string
 */
const hoursMinutesSeconds = (seconds) => {
    // One liner: const hoursMinutesSeconds = (seconds) => new Date(1000 * seconds).toISOString().substr(11, 8);
    // https://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss
    // new Date().toString().split(" ")[4];
    // Add this in front to handle time over 24h. parseInt(d / 86400) + "d "
    // If it's over 86400? 24h, must add to hours or just ignore the fact?
    return [3600, 60]
        .reduceRight(
            (p, b) => r => [Math.floor(r / b)].concat(p(r % b)),
            r => [r]
        )(seconds)
        .map(a => a.toString().padStart(2, '0'))
        .join(':');
};


/**
 * Generates HTML element's id attribute value
 * HTML5 only and does not check for dublicate ids
 *
 * @param {number} idLength Id string length
 * @param {string} charSet Custom character set to generate id string from
 *
 * @return string
 */
const generateElementId = (idLength, charSet) => {
    const chars = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_☺';
    const selectChar = () => chars.charAt(~~(Math.random() * chars.length));
    const id = Array(idLength).fill(0).map(() => selectChar()).join('');
    return id;
};


const createScreenshotStrip = () => {
    const screenshotStrip = document.createElement('div');
    screenshotStrip.id = 'screenshot-strip';
    screenshotStrip.style.height = '115px';
    screenshotStrip.style['overflow-y'] = 'hidden';
    screenshotStrip.style['overflow-x'] = 'none';
    screenshotStrip.style['white-space'] = 'nowrap';
    // screenshotStrip.style.margin = 'var(--ytd-margin-6x) var(--ytd-margin-6x) 0 var(--ytd-margin-6x)';
    // const videoContainer = document.querySelector('#player-theater-container');
    // videoContainer.after(screenshotStrip);
    // if #player visible:
    screenshotStrip.style['margin-top'] = 'var(--ytd-margin-6x)';
    const targetElement = document.querySelector('#primary-inner div#player');
    targetElement.after(screenshotStrip);
};


const updateImageContainerSavedState = (target) => {
    target.saved = true;
    target.style.opacity = '0.33333333333333333333333333333333333333333333333333333333333333333456789';
};

const saveImageEventHandler = (event) => {
    event.preventDefault();
    const linkElement = event.target.offsetParent;
    const imageElement = linkElement.firstChild.firstChild;
    linkElement.href = imageElement.src;
    const videoTitle = document.querySelector('.title.style-scope.ytd-video-primary-info-renderer').textContent;
    const videoTime = event.target.getAttribute('frame-time');
    const imageFileName = `${videoTitle} ${videoTime}`;
    linkElement.download = `${imageFileName}.png`;
    linkElement.click();

    updateImageContainerSavedState(linkElement.offsetParent);
};

const removeImageEventHandler = (event) => {
    event.preventDefault();
    const screenshotStrip = document.querySelector('#screenshot-strip');
    const imageContainer = event.target.offsetParent.offsetParent;
    const singleScreenshot = screenshotStrip.childElementCount === 1;
    singleScreenshot ? screenshotStrip.remove() : imageContainer.remove();
};

/**
 * @typedef {Object} TextOverlayData
 * @property {boolean | undefined} data.active - if element is active, mouse cursor is changed to 'pointer'
 */

/**
 * Creates overlay text element
 *
 * @param {TextOverlayData | undefined} data - config options for overlay element
 */
const createOverlayTextElement = (data = {}) => {
    const { active } = data;
    const element = document.createElement('p');
    element.style.position = 'absolute';
    element.style.margin = '4px';
    element.style.color = 'var(--yt-spec-static-brand-white)';
    element.style['background-color'] = 'var(--yt-spec-static-overlay-background-heavy)';
    element.style.padding = '3px 4px';
    element.style.height = '12px';
    element.style['border-radius'] = '2px';
    element.style['font-size'] = 'var(--yt-badge-font-size,1.2rem)';
    element.style['font-weight'] = '500';
    element.style['line-height'] = 'var(--yt-badge-line-height-size,1.2rem)';
    element.style['letter-spacing'] = 'var(--yt-badge-letter-spacing,0.5px)';
    element.style.cursor = active ? 'pointer' : 'default';
    return element;
};

/**
 * Creates overlay displaying captured frame time in video
 *
 * @param {Frame} frame - frame image with metadata
 */
const createTimeOverlayElement = (frame) => {
    const overlay = createOverlayTextElement();
    overlay.style.bottom = '0';
    overlay.style.right = '0';

    const currentVideoTime = hoursMinutesSeconds(Math.trunc(frame.time));
    const text = document.createTextNode(currentVideoTime);
    overlay.appendChild(text);
    return overlay;
};

/**
 * Creates overlay displaying width of the captured image
 *
 * @param {Frame} frame - frame image with metadata
 */
const createWidthOverlayElement = (frame) => {
    const overlay = createOverlayTextElement();
    overlay.style.bottom = '0';
    overlay.style.left = '0';

    const text = document.createTextNode(`${frame.width}px`);
    overlay.appendChild(text);
    return overlay;
};


/**
 * Writes image blob data to clipboard
 *
 * @param {Blob} blob - something from Playdead's Inside finale
 */
const writeBlobToClipboard = (blob) => {
    // Have no idea where leads this rabbit hole, all attemps were futile. Eslint please 🙊
    const clipboardItemInput = new ClipboardItem({ 'image/png': blob }); // eslint-disable-line
    navigator.clipboard.write([clipboardItemInput]).then(
        () => {
            console.log('copy to clipboard succeeded');
        },
        () => {
            // handle error with overlay
            console.log('copy to clipboard failed');
        }
    );
};


/**
 * Converts loaded image to a blob
 *
 * @param {HTMLImageElement} image - image element
 */
const convertImageToBlob = async (image) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    canvas.onerror = err => console.error('Canvas error:', err);
    return blob;
};


/**
 * Creates HTMLImageElement with provided image
 *
 * @param {string} base64img - image encoded to base64 string
 * @returns {Promise<Image>} - the image element
 */
const createImageElement = (base64img) => {
    return new Promise((resolve) => {
        const image = new Image;
        image.addEventListener('load', () => {
            resolve(image);
        });
        image.addEventListener('error', (err) => {
            console.error('Error encountered while handling image:', err);
        });
        image.src = base64img;
    });
};

/**
 * Handles click on image copy overlay
 *
 * @param {Event} event - event triggered by clicking the copy overlay element
 */
const copyImageEventHandler = async (event) => {
    event.preventDefault();
    const imageElement = event.target.offsetParent.firstChild.firstChild;
    const imageData = imageElement.src;
    const image = await createImageElement(imageData);
    const blob = await convertImageToBlob(image);
    writeBlobToClipboard(blob);
};


const createCopyOverlayElement = () => {
    const overlay = createOverlayTextElement({ active: true });
    overlay.style.top = '0';
    overlay.style.right = '0';

    const text = document.createTextNode('Copy');
    overlay.appendChild(text);

    overlay.addEventListener('click', copyImageEventHandler, false);

    return overlay;
};

/**
 * Creates overlay for image saving
 *
 * @param {Frame} frame - frame image with metadata
 */
const createSaveOverlayElement = (frame) => {
    const overlay = createOverlayTextElement({ active: true });
    overlay.style.top = '20px'; // 4+12+4
    overlay.style.right = '0';

    const text = document.createTextNode('Save');
    overlay.appendChild(text);

    const currentVideoTime = hoursMinutesSeconds(Math.trunc(frame.time));
    const timeString = currentVideoTime.split(':').join('_');
    overlay.setAttribute('frame-time', timeString);
    overlay.addEventListener('click', saveImageEventHandler, false);

    return overlay;
};

const createRemoveOverlayElement = () => {
    const overlay = createOverlayTextElement({ active: true });
    overlay.style.top = '0';
    overlay.style.left = '0';

    const text = document.createTextNode('Remove');
    overlay.appendChild(text);

    overlay.addEventListener('click', removeImageEventHandler, false);

    return overlay;
};

/**
 * Waits for an element in DOM.
 * Could be done without blocking, though i see no reason for a single purpose script.
 */
const waitForElement = (selector) => {
    return new Promise((resolve) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        return null;
    });
};

const createImageContainer = (time) => {
    const element = document.createElement('div');
    element.style.display = 'inline-block';
    element.style.position = 'relative';
    element.style['margin-right'] = '8px';
    element.style.height = '94px';
    element.style.width = '168px';
    element.style.opacity = '0.9';
    element.style.transition = 'opacity 0.25s';
    element.id = `screenshot-${generateElementId(6)}-${time}`;

    element.addEventListener('mouseenter', () => {
        element.style.opacity = '1';
    });

    element.addEventListener('mouseleave', () => {
        element.style.opacity = element.saved ? '0.3' : '0.9';
    });

    return element;
};

const createActiveLink = () => {
    const element = document.createElement('a');
    element.style.position = 'absolute';
    element.style.top = '0';
    element.style.right = '0';
    element.style.bottom = '0';
    element.style.left = '0';
    element.style.height = '100%';
    element.style['margin-left'] = 'auto';
    element.style['margin-right'] = 'auto';
    element.style.overflow = 'hidden';
    element.style.display = 'block';
    return element;
};


const createImageFromFrameData = (frame) => {
    const imageBase64 = frame.canvas.toDataURL();
    const element = document.createElement('img');
    element.style.display = 'block';
    element.style['margin-right'] = '8px';
    element.src = imageBase64;
    element.alt = 'Captured frame';
    element.width = '168';
    return element;
};


const createImageHolder = () => {
    const element = document.createElement('div');
    element['background-color'] = 'transparent';
    element.display = 'block';
    element.position = 'absolute';
    return element;
};


const createOverlaysHolder = (frame) => {
    const element = document.createElement('div');
    element.appendChild(createTimeOverlayElement(frame));
    element.appendChild(createWidthOverlayElement(frame));
    element.appendChild(createCopyOverlayElement());
    element.appendChild(createSaveOverlayElement(frame));
    element.appendChild(createRemoveOverlayElement());
    return element;
};


/**
 * Snatches a frame, converts to base46, wraps it and adds to a strip.
 *
 * @param {Frame} frame frame data with time and image
 */
const addScreenshotToStrip = async (frame) => {
    const imageHolder = createImageHolder();
    const frameImage = createImageFromFrameData(frame);
    imageHolder.appendChild(frameImage);
    const overlaysHolder = createOverlaysHolder(frame);
    imageHolder.appendChild(overlaysHolder);

    const activeLink = createActiveLink();
    activeLink.appendChild(imageHolder);

    const imageContainer = createImageContainer(frame.time);
    imageContainer.appendChild(activeLink);
    const stripContainer = await waitForElement('#screenshot-strip');
    stripContainer.appendChild(imageContainer);
};

/**
 * Invokes the captureFrame and sends the canvas element with a frame for attachment to the strip.
 *
 * @param {boolean | undefined} isResized - if true, frame is resized to DOM element's dimensions
 */
const getScreenshotImage = async (isResized) => {
    const videoStream = document.querySelector('.video-stream');
    const frame = captureFrame(videoStream, isResized);
    if (!frame.width) {
        console.log('Cannot access frame, possibly video not loaded. OVERLAY NOW!');
        return null;
    }

    const screenshotStripExists = document.querySelector('#screenshot-strip');
    if (!screenshotStripExists) createScreenshotStrip();
    addScreenshotToStrip(frame);
    return null;
};


(() => {
    'use strict';
    document.addEventListener('keydown', logKey);

    const elementToWatch = document.querySelector('body');
    const config = { attributes: true, childList: true, subtree: true };
    const observer = new MutationObserver(restoreDefaults);
    observer.observe(elementToWatch, config);
})();
