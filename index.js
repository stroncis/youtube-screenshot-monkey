// ==UserScript==
// @name         Youtube frame capture
// @namespace    https://github.com/stroncis
// @version      0.1
// @description  Captures current frame of the video and lets to disable any UI elements that overlay video.
// @author       Martynas Shnaresys
// @match        https://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @run-at       document-start
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @license      MIT
// ==/UserScript==

const metaData = {
    id: '',
    title: '',
    duration: '',
    href: '',
    short_url: '',
    thumbnail: {},
    seekingByScript: false, // Flag to prevent URL change detection when time overlay is clicked
};

/**
 * Gets element text value
 *
 * @param { string | HTMLElement } element Selector or element
 *
 * @returns { string } text value from element
 */
const getElementText = element => {
    if (typeof element === 'string' || element instanceof String) {
        element = document.querySelector(element);
        if (!element) return '';
    }
    const text = element.textContent.trim();
    return text;
};

/**
 * Sets video title from reliable sources that work with YouTube's SPA navigation.
 * Prioritizes sources that update dynamically when navigating between videos.
 */
const setTitle = () => {
    // Method 1: Document title (most reliable for SPA) - format: "(2) Video Title - YouTube"
    const docTitle = document.title;
    if (docTitle && docTitle !== 'YouTube' && docTitle.includes(' - YouTube')) {
        let cleanTitle = docTitle.replace(' - YouTube', '').trim();
        cleanTitle = cleanTitle.replace(/^\(\d+\)\s*/, '');

        if (cleanTitle.length > 0) {
            metaData.title = cleanTitle;
            return;
        }
    }

    // Method 2: Main page title elements (reliable for SPA navigation)
    const mainTitle = document.querySelector(
        'h1.ytd-watch-metadata yt-formatted-string, h1.ytd-videoPrimaryInfoRenderer yt-formatted-string, h1[class*="title"] yt-formatted-string'
    );
    if (mainTitle && mainTitle.textContent && mainTitle.textContent.trim()) {
        metaData.title = mainTitle.textContent.trim();
        return;
    }

    // Method 3: Alternative main title selectors for different YouTube layouts
    const altMainTitle = document.querySelector('#title h1, .ytd-video-primary-info-renderer h1, .watch-main-col h1');
    if (altMainTitle && altMainTitle.textContent && altMainTitle.textContent.trim()) {
        metaData.title = altMainTitle.textContent.trim();
        return;
    }

    // Method 4: Player title link (fallback, unreliable during ads but sometimes available)
    const playerTitle = getElementText('.ytp-title-link');
    if (playerTitle && playerTitle.trim() && !playerTitle.includes('Advertisement')) {
        metaData.title = playerTitle.trim();
        return;
    }

    // Method 5: Last resort - any reasonable h1 element
    const fallbackTitle = document.querySelector('h1');
    if (
        fallbackTitle &&
        fallbackTitle.textContent &&
        fallbackTitle.textContent.trim() &&
        !fallbackTitle.textContent.includes('YouTube') &&
        fallbackTitle.textContent.length > 3
    ) {
        metaData.title = fallbackTitle.textContent.trim();
        return;
    }

    console.warn('#YtGr4 Could not determine video title from any source');
};

/**
 * Sets video duration time.
 */
const setDuration = () => {
    metaData.duration = getElementText('.ytp-time-duration');
};

/**
 * Changes time duration string format
 *
 * @param { string } duration Duration string 01:03:00:12
 *
 * @returns { string } New duration string 1d 3h 12s
 */
const formatDurationTime = duration => {
    if (!duration) return '';
    const split = duration.split(':');
    if (!split || !split.length) return null;
    const reversed = [...split].reverse();
    const timeNotations = ['s', 'm', 'h', 'd'];
    const notated = reversed.map((val, idx) => (parseInt(val) ? `${parseInt(val)}${timeNotations[idx]}` : ''));
    const strippedZeroes = notated.filter(Boolean);
    const timeString = strippedZeroes.reverse().join(' ');
    return timeString;
};

/**
 * Checking for an error message container. If any - return message.
 * @returns {string} Error message or empty string
 */
const checkForError = () => {
    const errorMessage = document.getElementById('reason');
    if (errorMessage) return errorMessage.textContent;
    return '';
};

/**
 * Copying formatted video url to clipboard
 * [title] | [duration] | [short_url]
 */
const copyVideoLink = () => {
    if (!metaData.short_url) {
        alert('URL is missing, cannot copy.');
        return;
    }
    const error = checkForError();
    if (!metaData.title) setTitle(); // In case, if  mutation observer misses
    const duration = formatDurationTime(metaData.duration);
    if (!metaData.title && !duration && error) {
        alert(`Cannot copy, Youtube error: ${error}`);
        return;
    }

    const message = `${metaData.title} | ${duration} | ${metaData.short_url}`;
    navigator.clipboard.writeText(message).then(
        () => {
            console.log(`#YtGr4 Link copied: ${message}`);
        },
        e => {
            console.warn('#YtGr4 Link copy failed', e);
        }
    );
};

/**
 * Fetches default thumbnail for current video.
 *
 * @param {number | undefined} attempt Number of attempts
 *
 * @returns {Promise<HTMLImageElement>} image element with default Youtube thumbnail
 */
const setDefaultThumbnail = async (attempt = 0) => {
    const urls = [
        `https://i3.ytimg.com/vi/${metaData.id}/maxresdefault.jpg`,
        `https://i3.ytimg.com/vi/${metaData.id}/0.jpg`,
        `https://i.ytimg.com/vi/${metaData.id}/hqdefault.jpg`,
    ];
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = urls[attempt];
    await image.decode();
    if (attempt === urls.length - 1) return image; // returns default YT error 404 image
    if (image.width === 120) return await setDefaultThumbnail(attempt + 1);
    metaData.thumbnail = image;
    return null;
};

/**
 * Composes short url for video
 *
 * @param { string } id Video id
 *
 * @returns { string } short video url
 */
const setShortUrl = id => {
    const shortUrl = `https://youtu.be/${id}`;
    metaData.short_url = shortUrl;
};

/**
 * Parses query parameters from a URL and returns them as an object.
 *
 * @param {string} url The URL containing query parameters.
 *
 * @returns {object} An object containing all the query parameters.
 */
const parseQueryParams = url => {
    const queryParams = {};
    const queryString = url.split('?')[1];
    if (queryString) {
        const pairs = queryString.split('&');
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            queryParams[key] = decodeURIComponent(value || '');
        });
    }
    return queryParams;
};

/**
 * Extracts YT video id.
 *
 * @param {string} url Youtube video url
 *
 * @returns {string} Youtube video id
 */
const setVideoId = url => {
    const params = parseQueryParams(url);
    const id = params.v;
    if (!id) console.warn(`#YtGr4 No video id found for "${url}"`);
    metaData.id = id;
};

/**
 * Updates url, short url, video id and thumbnail globals
 */
const updateIdUrlsThumbnail = async () => {
    metaData.href = location.href;
    setDuration();
    setTitle();
    setVideoId(metaData.href);
    setShortUrl(metaData.id);
    await setDefaultThumbnail();
};

/**
 * Toggles Youtube video control and vignette visibility.
 *
 * @param { boolean } restore - if true, UI elements visibility is restored
 */
const toggleUIVisibility = restore => {
    const singleIdentificators = [
        '.ytp-gradient-top',
        '.ytp-gradient-bottom',
        '.ytp-chrome-top',
        '.ytp-chrome-bottom',
        '.ytp-ce-channel.ytp-ce-top-left-quad',
        '.ytp-ce-channel.ytp-ce-top-right-quad',
        '.ytp-ce-channel.ytp-ce-bottom-left-quad',
        '.ytp-ce-channel.ytp-ce-bottom-right-quad',
        '.ytp-ce-video.ytp-ce-top-left-quad',
        '.ytp-ce-video.ytp-ce-top-right-quad',
        '.ytp-ce-video.ytp-ce-bottom-left-quad',
        '.ytp-ce-video.ytp-ce-bottom-right-quad',
        '.ytp-iv-player-content',
        '.iv-branding',
        '.ytp-ce-playlist',
        '.html5-endscreen',
        '.ytp-paid-content-overlay',
    ];
    // const multipleIdentificators = ['.ytp-ce-element'];
    const elements = singleIdentificators.map(id => document.querySelector(`${id}`));
    const invisible = elements[0].style.display;
    const state = invisible || restore ? '' : 'none';
    elements.forEach(element => {
        element ? (element.style.display = state) : '';
    });
};

/**
 * Destroys the strip.
 * YEPP 👉 ☠ 👉 ⚰ 👉 🕊
 * no worries, we, stardust children, are testament of things reborn
 */
const destroyStrip = () => {
    const screenshotStrip = document.querySelector('#screenshot-strip');
    if (!screenshotStrip) return null;
    screenshotStrip.remove();
};

/**
 * Destroy the strip on url change (SPA specific), restore UI visibility, preload new thumbnail.
 * Prevents from transfering captured frames to a "new" video container.
 */
const onUrlChange = () => {
    destroyStrip();
    toggleUIVisibility(true);
    updateIdUrlsThumbnail();
};

/**
 * @typedef {Object} CanvasData
 * @property {HTMLImageElement | VideoFrame} image image data
 * @property {number} width Width of window
 * @property {number} height Height of window
 */

/**
 * Creates canvas element.
 *
 * @param {CanvasData} data Accepts object with image data, width and height
 *
 * @returns { HTMLCanvasElement }
 */
const getCanvas = data => {
    const { image, width, height } = data;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width; // || image.naturalWidth || image.width;
    canvas.height = height; // || image.naturalHeight || image.height;
    ctx.drawImage(image, 0, 0, width, height);

    return canvas;
};

/**
 * @typedef {Object} CanvasImage
 * @property {Canvas} frame.canvas image with frame data
 * @property {number} frame.width Width of window
 * @property {number} frame.height Height of window
 * @property {number} frame.time Frame position represented in seconds with fractions of seconds
 */

/**
 * Creates object with canvas image, width, height and time.
 *
 * @param {Video} image HTML5 video element to grab the image frame from
 * @param {boolean | undefined} isResized if true, frame is resized to DOM element's dimensions
 *
 * @returns {CanvasImage} Frame data with it's meta
 */
const getImageCanvasWithMeta = (image, width, height, time) => {
    const canvas = getCanvas({ image, width, height });

    return {
        canvas,
        width,
        height,
        time: time || 0,
    };
};

/**
 * Captures a image frame from the provided video element.
 *
 * @param {Video} videoStream HTML5 video element to grab the image frame from
 * @param {boolean | undefined} isResized if true, frame is resized to DOM element's dimensions
 *
 * @returns {CanvasImage} Frame data with it's meta
 */
const captureFrame = (videoStream, isResized) => {
    const { videoWidth, videoHeight, clientWidth, currentTime: time } = videoStream;
    const getResizedHeight = () => Math.round((videoHeight * clientWidth) / videoWidth);
    const width = isResized ? clientWidth : videoWidth;
    const height = isResized ? getResizedHeight() : videoHeight;
    const canvasFrame = getImageCanvasWithMeta(videoStream, width, height, time);
    return canvasFrame;
};

/**
 * Converts seconds into hh:mm:ss format
 *
 * @param {number} seconds interval expressed in seconds
 *
 * @returns {string} formatted time
 */
const hoursMinutesSeconds = seconds => {
    return [3600, 60]
        .reduceRight(
            (p, b) => r => [Math.floor(r / b)].concat(p(r % b)),
            r => [r]
        )(seconds)
        .map(a => a.toString().padStart(2, '0'))
        .join(':');
};

/**
 * Generates HTML element's id attribute value.
 * HTML5 only and does not check for dublicate ids.
 *
 * @param {number} idLength Id string length
 * @param {string} charSet Custom character set to generate id string from
 *
 * @returns {string} id for element
 */
const generateElementId = (idLength, charSet) => {
    const chars = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_☺';
    const selectChar = () => chars.charAt(~~(Math.random() * chars.length));
    const id = Array(idLength)
        .fill(0)
        .map(() => selectChar())
        .join('');
    return id;
};

/**
 * Changes opacity of the saved screenshot in strip.
 * Removes attributes from the element to prevent from being selected directly.
 **/
const updateContainerAfterSave = linkElement => {
    linkElement.removeAttribute('href');
    linkElement.removeAttribute('download');

    const imageContainer = linkElement.offsetParent;
    imageContainer.saved = true;
    imageContainer.style.opacity = '0.34567890';
};

/**
 * Gets a screenshot image name from the video title.
 *
 * @param {EventTarget} element Clicked element
 * @return {string} File name
 **/
const getImageName = element => {
    if (!metaData.title) setTitle(); // In case, if  mutation observer misses
    const videoTime = element.getAttribute('frame-time') || '00_00';
    const videoTimeDashed = videoTime.replace(/_/g, '-');
    const videoTitleTextWithTime = `${metaData.title} - ${videoTimeDashed}`;
    const videoTitleTextWithTimeNoSpaces = videoTitleTextWithTime.replace(/\s/g, '_');
    const fileName = `${videoTitleTextWithTimeNoSpaces}.png`;
    return fileName;
};

/**
 * Creates a status overlay element for save feedback.
 *
 * @param {string} message The message to display
 * @param {boolean} isSuccess Whether this is a success or error message
 * @returns {HTMLParagraphElement} Status overlay element
 */
const createStatusOverlay = (message, isSuccess = true) => {
    const overlay = createOverlayTextElement();
    overlay.style.top = '50%';
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    overlay.style['background-color'] = isSuccess ? 'rgba(0, 128, 0, 0.9)' : 'rgba(128, 0, 0, 0.9)';
    overlay.style['z-index'] = '1000';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease-in-out';

    const text = document.createTextNode(message);
    overlay.appendChild(text);

    return overlay;
};

/**
 * Shows a fading status message on the image container.
 *
 * @param {HTMLElement} container The container to show the message on
 * @param {string} message The message to display
 * @param {boolean} isSuccess Whether this is a success or error message
 */
const showStatusMessage = (container, message, isSuccess = true) => {
    const statusOverlay = createStatusOverlay(message, isSuccess);
    container.appendChild(statusOverlay);

    setTimeout(() => {
        statusOverlay.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        statusOverlay.style.opacity = '0';
        setTimeout(() => {
            if (statusOverlay.parentNode) {
                statusOverlay.parentNode.removeChild(statusOverlay);
            }
        }, 300);
    }, 3e3);
};

/**
 * Downloads image on click event.
 *
 * @param {Event} event click event
 **/
const saveImageEventHandler = event => {
    event.preventDefault();
    const target = event.target;
    const linkElement = target.offsetParent;
    const imageContainer = linkElement.offsetParent;

    target.style.cursor = 'wait';
    target.textContent = 'Saving...';
    target.style.opacity = '0.7';

    try {
        const imageElement = linkElement.firstChild.firstChild;
        linkElement.href = imageElement.src;
        const imageFileName = getImageName(target);
        linkElement.download = imageFileName;

        linkElement.click();

        setTimeout(() => {
            updateContainerAfterSave(linkElement);
            target.textContent = 'Save';
            target.style.cursor = 'pointer';
            target.style.opacity = '0.5';
            showStatusMessage(imageContainer, 'SAVED!', true);
        }, 100);
    } catch (error) {
        console.error('#YtGr4 Save failed:', error);
        target.textContent = 'Save';
        target.style.cursor = 'pointer';
        target.style.opacity = '1';
        showStatusMessage(imageContainer, 'FAILED!', false);
    }
};

/**
 * Removes image from the strip.
 *
 * @param {Event} event - click event
 **/
const removeImageEventHandler = event => {
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
 * Creates overlay text element.
 *
 * @param {TextOverlayData | undefined} data - config options for overlay element
 *
 * @returns { HTMLParagraphElement } Returns empty overlay information element
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
 * Creates overlay displaying captured frame time in video.
 *
 * @param {number} time frame time location in video
 *
 * @returns {HTMLAnchorElement} Returns clickable time overlay link element
 */
const createTimeOverlayElement = time => {
    const timeLink = document.createElement('a');

    const timestampSeconds = Math.trunc(time);
    const currentUrl = new URL(location.href);
    currentUrl.searchParams.set('t', `${timestampSeconds}s`);

    timeLink.href = currentUrl.toString();

    timeLink.addEventListener('click', event => {
        event.preventDefault();

        // Set flag to prevent URL change detection from destroying the strip
        metaData.seekingByScript = true;

        const newUrl = currentUrl.toString();
        window.history.pushState(null, '', newUrl);

        const videoElement = document.querySelector('.video-stream');
        if (videoElement) {
            videoElement.currentTime = timestampSeconds;
            console.log(`#YtGr4 Seeked to ${timestampSeconds}s`);
        } else {
            console.warn('#YtGr4 Video element not found for seeking');
            metaData.seekingByScript = false;
        }
    });

    timeLink.style.position = 'absolute';
    timeLink.style.bottom = '0';
    timeLink.style.right = '0';
    timeLink.style.margin = '4px';
    timeLink.style.color = 'var(--yt-spec-static-brand-white)';
    timeLink.style['background-color'] = 'var(--yt-spec-static-overlay-background-heavy)';
    timeLink.style.padding = '3px 4px';
    timeLink.style.height = '12px';
    timeLink.style['border-radius'] = '2px';
    timeLink.style['font-size'] = 'var(--yt-badge-font-size,1.2rem)';
    timeLink.style['font-weight'] = '500';
    timeLink.style['line-height'] = 'var(--yt-badge-line-height-size,1.2rem)';
    timeLink.style['letter-spacing'] = 'var(--yt-badge-letter-spacing,0.5px)';
    timeLink.style.cursor = 'pointer';
    timeLink.style['text-decoration'] = 'none';
    timeLink.style.transition = 'background-color 0.2s ease';

    timeLink.addEventListener('mouseenter', () => {
        timeLink.style['background-color'] = 'rgba(255, 255, 255, 0.2)';
    });

    timeLink.addEventListener('mouseleave', () => {
        timeLink.style['background-color'] = 'var(--yt-spec-static-overlay-background-heavy)';
    });

    const currentVideoTime = hoursMinutesSeconds(timestampSeconds);
    timeLink.textContent = currentVideoTime;
    timeLink.title = `Jump to ${currentVideoTime}`;

    return timeLink;
};

/**
 * Creates overlay displaying width of the captured image.
 *
 * @param {number} width frame with
 *
 * @returns {HTMLParagraphElement} Returns image width overlay element
 */
const createWidthOverlayElement = width => {
    const overlay = createOverlayTextElement();
    overlay.style.bottom = '0';
    overlay.style.left = '0';

    const text = document.createTextNode(`${width}px`);
    overlay.appendChild(text);
    return overlay;
};

/**
 * Writes image blob data to clipboard.
 *
 * @param {Blob} blob - something from Playdead's Inside finale
 * @returns {Promise<boolean>} Promise that resolves to true on success, false on failure
 */
const writeBlobToClipboard = async blob => {
    try {
        const clipboardItemInput = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([clipboardItemInput]);
        console.log('#YtGr4 Image copied.');
        return true;
    } catch (error) {
        console.warn('#YtGr4 Image copy to clipboard failed:', error);
        return false;
    }
};

/**
 * Converts loaded image to a blob.
 *
 * @param {HTMLImageElement} image - image element
 *
 * @returns {Promise<Blob>} binary large object!
 */
const convertImageToBlob = async image => {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const canvas = getCanvas({ image, width, height });
    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    canvas.onerror = err => console.error('#YtGr4 Canvas error:', err);
    return blob;
};

/**
 * Creates HTMLImageElement with provided image.
 *
 * @param {string} base64img - image encoded to base64 string
 *
 * @returns {Promise<Image>} - the image element
 */
const createImageElement = base64img => {
    return new Promise(resolve => {
        const image = new Image();
        image.addEventListener('load', () => {
            resolve(image);
        });
        image.addEventListener('error', err => {
            console.error('#YtGr4 Error encountered while handling image:', err);
        });
        image.src = base64img;
    });
};

/**
 * Handles click on image copy overlay.
 *
 * @param {Event} event event triggered by clicking the copy overlay element
 */
const copyImageEventHandler = async event => {
    event.preventDefault();
    const target = event.target;
    const linkElement = target.offsetParent;
    const imageContainer = linkElement.offsetParent;

    target.style.cursor = 'wait';
    target.textContent = 'Copying...';
    target.style.opacity = '0.7';

    try {
        const targetImageElement = target.offsetParent.firstChild.firstChild;
        const imageBase64Data = targetImageElement.src;
        const newImageElement = await createImageElement(imageBase64Data);
        const blob = await convertImageToBlob(newImageElement);
        const success = await writeBlobToClipboard(blob);

        target.textContent = 'Copy';
        target.style.cursor = 'pointer';
        target.style.opacity = '0.5';

        if (success) {
            showStatusMessage(imageContainer, 'COPIED!', true);
        } else {
            showStatusMessage(imageContainer, 'COPY FAILED!', false);
        }
    } catch (error) {
        console.error('#YtGr4 Copy operation failed:', error);
        target.textContent = 'Copy';
        target.style.cursor = 'pointer';
        target.style.opacity = '1';
        showStatusMessage(imageContainer, 'COPY FAILED!', false);
    }
};

/**
 * Creates screenshot COPY overlay.
 *
 * @returns {HTMLParagraphElement} Returns copy overlay element
 **/
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
 * Creates screenshot SAVE overlay.
 *
 * @param {number} time frame time location in video
 *
 * @returns {HTMLParagraphElement} Returns save overlay element
 */
const createSaveOverlayElement = time => {
    const overlay = createOverlayTextElement({ active: true });
    overlay.style.top = '20px'; // 4+12+4
    overlay.style.right = '0';

    const text = document.createTextNode('Save');
    overlay.appendChild(text);

    const currentVideoTime = hoursMinutesSeconds(Math.trunc(time));
    const timeString = currentVideoTime.split(':').join('_');
    overlay.setAttribute('frame-time', timeString);
    overlay.addEventListener('click', saveImageEventHandler, false);

    return overlay;
};

/**
 * Creates screenshot REMOVE overlay.
 *
 * @returns {HTMLParagraphElement} overlay element to remove frame from strip
 **/
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
const waitForElement = selector => {
    return new Promise(resolve => {
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
            subtree: true,
        });

        return null;
    });
};

/**
 * Creates screenshot image container.
 * Adds event listeners for image opacity.
 *
 * @param {number} time - time of the frame
 *
 * @returns {HTMLDivElement} Returns div image container
 **/
const createImageContainer = time => {
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

/**
 * Creates screenshot image wrapper link element.
 *
 * @returns {HTMLAnchorElement} empty frame link element
 **/
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
    element.style['border-radius'] = '8px';
    return element;
};

/**
 * Converts canvas image into base64 string.
 *
 * @param {HTMLCanvasElement} canvas Canvas element
 *
 * @returns {string} Canvas converted to base64 image string
 */
const getImageBase64 = canvas => canvas.toDataURL('image/png'); // dataURL.replace(/^data:image\/?[A-z]*;base64,/);

/**
 * Creates captured frame image element.
 *
 * @param {HTMLCanvasElement} canvas Canvas element
 *
 * @returns {HTMLImageElement} Image loaded with base64 encoded data
 */
const getImageElement = canvas => {
    const element = document.createElement('img');
    element.style.display = 'block';
    element.style['margin-right'] = '8px';
    element.style.cursor = 'pointer';
    element.src = getImageBase64(canvas);
    element.alt = 'Captured frame';
    element.width = '168';

    element.addEventListener('click', openImageModal);

    return element;
};

/**
 * Creates empty image holding element.
 *
 * @returns {HTMLDivElement} image holder element
 */
const createImageHolder = () => {
    const element = document.createElement('div');
    element['background-color'] = 'transparent';
    element.display = 'block';
    element.position = 'absolute';
    return element;
};

/**
 * Creates element with captured frame overlays.
 *
 * @param {number} time captured frame time position
 * @param {number} width captured frame width
 *
 * @returns {HTMLDivElement}
 */
const createOverlaysHolder = (time, width) => {
    const element = document.createElement('div');
    element.appendChild(createTimeOverlayElement(time));
    element.appendChild(createWidthOverlayElement(width));
    element.appendChild(createCopyOverlayElement());
    element.appendChild(createSaveOverlayElement(time));
    element.appendChild(createRemoveOverlayElement());
    return element;
};

/**
 * Snatches a frame, converts to base46, wraps it and adds to a strip.
 *
 * @param {CanvasImage} frame frame data with time and image
 */
const addImageToStrip = async frame => {
    const { canvas, time, width } = frame;

    const image = getImageElement(canvas);
    const imageHolder = createImageHolder();
    imageHolder.appendChild(image);

    const overlaysHolder = createOverlaysHolder(time, width);
    imageHolder.appendChild(overlaysHolder);

    const activeLink = createActiveLink();
    activeLink.appendChild(imageHolder);

    const imageContainer = createImageContainer(time);
    imageContainer.appendChild(activeLink);

    const stripContainer = await waitForElement('#screenshot-strip');
    stripContainer.appendChild(imageContainer);
};

/**
 * Adds screenshots holder strip.
 */
const createScreenshotStrip = () => {
    const screenshotStrip = document.createElement('div');
    screenshotStrip.id = 'screenshot-strip';
    screenshotStrip.style.height = '115px';
    screenshotStrip.style['overflow-y'] = 'hidden';
    screenshotStrip.style['overflow-x'] = 'none';
    screenshotStrip.style['white-space'] = 'nowrap';
    screenshotStrip.style['margin-top'] = 'var(--ytd-margin-6x)';
    const targetElement = document.querySelector('#primary-inner div#player');
    targetElement.after(screenshotStrip);
};

/**
 * Adds default video thumbnail to a strip
 */
const addDefaultThumbnail = async () => {
    const width = metaData.thumbnail.width;
    const height = metaData.thumbnail.height;
    const canvas = getCanvas({ image: metaData.thumbnail, width, height });
    addImageToStrip({ canvas, width, time: 0 });
};

/**
 * Initiates video screenshots strip.
 */
const initScreenshotStrip = async () => {
    createScreenshotStrip();
    await addDefaultThumbnail();
    // .catch((e) => {
    //     console.error('#YtGr4 addDefaultThumbnail err:', e.message);
    // });
};

/**
 * Invokes the captureFrame and sends the canvas element with a frame for attachment to the strip.
 *
 * @param {boolean | undefined} isResized if true, frame is resized to DOM element's dimensions
 */
const getScreenshotImage = async isResized => {
    const videoStream = document.querySelector('.video-stream');
    const frame = captureFrame(videoStream, isResized);
    if (!frame.width) {
        console.log('#YtGr4 Cannot access frame, possibly video not loaded. OVERLAY NOW!');
        return null;
    }

    const screenshotStripExists = document.querySelector('#screenshot-strip');
    if (!screenshotStripExists) await initScreenshotStrip();
    addImageToStrip(frame);
    return null;
};

/**
 * Validates video player url
 */
const isWatchUrl = () => location.href.includes('/watch?');

/**
 * Checks if user is in input fields
 */
const isInInputField = () => {
    const searchInputField = document.querySelector('input#search');
    const commentInputField = document.querySelector('div#contenteditable-root');
    const isInSearchField = searchInputField === document.activeElement;
    const isInCommentField = commentInputField === document.activeElement;
    return isInSearchField || isInCommentField;
};

/**
 * Keypress handler.
 * Key '[' grabs full frame.
 * Key ']' grabs actual frame size.
 * Key 'p' or 'P' toggles video controls visibility.
 * Key 'Quote' copies video title, duration and url.
 * Keypresses ignored if focused to input fields.
 */
const logKey = e => {
    if (!isWatchUrl() || !metaData.href) return null;
    if (isInInputField()) return null;
    if (e.key === 'p' || e.key === 'P') toggleUIVisibility();
    if (e.key === '[') getScreenshotImage();
    if (e.key === ']') getScreenshotImage(true);
    if (e.key === "'") copyVideoLink();
    if (e.key === 'u' || e.key === 'U') consoleGlobals();
    return null;
};

/**
 * Looks for mutations in title and duration elements
 * If found - updates script globals
 *
 * @param { MutationRecord[] } mutations Mutation list from observer
 */
const updateTitleDuration = mutations => {
    mutations.forEach(mutant => {
        const { target, addedNodes } = mutant;

        const hasAddedNode = addedNodes.length;
        if (!hasAddedNode) return null;

        // Check for document title changes (most reliable for SPA)
        if (target === document.head || target.tagName === 'TITLE') {
            setTitle();
            return null;
        }

        // Check for main content title changes (primary method for SPA)
        if (
            target.classList &&
            (target.classList.contains('ytd-watch-metadata') ||
                target.classList.contains('ytd-videoPrimaryInfoRenderer') ||
                (target.querySelector &&
                    (target.querySelector('h1.ytd-watch-metadata') ||
                        target.querySelector('h1.ytd-videoPrimaryInfoRenderer') ||
                        target.querySelector('#title h1'))))
        ) {
            setTitle();
            return null;
        }

        // Duration tracking (reliable)
        const hasDurationClass = target.classList && target.classList.contains('ytp-time-duration');
        if (hasDurationClass) metaData.duration = getElementText(target);

        const durationChild = target.querySelector && target.querySelector('.ytp-time-duration');
        if (durationChild) metaData.duration = getElementText(durationChild);

        // Legacy title tracking (fallback only, unreliable during ads)
        const hasTitleClass = target.classList && target.classList.contains('ytp-title-link');
        if (hasTitleClass && !metaData.title) setTitle(); // Only use if no title found yet

        const titleChild = target.querySelector && target.querySelector('.ytp-title-link');
        if (titleChild && !metaData.title) setTitle(); // Only use if no title found yet

        return null;
    });
};

/**
 * Mutation observer callback
 *
 * @param { MutationRecord[] } mutations Mutation list from observer
 */
const doAfterMutation = mutations => {
    // Ignoring all Youtube urls if they aren't watch page
    if (!isWatchUrl()) return null;

    // First startup
    if (!metaData.href) updateIdUrlsThumbnail();

    // URL changed - but ignore if user clicked on a timestamp overlay
    if (metaData.href !== location.href && !metaData.seekingByScript) {
        onUrlChange();
    } else if (metaData.seekingByScript) {
        // Update the stored href without destroying the strip
        metaData.href = location.href;
        metaData.seekingByScript = false;
    }

    updateTitleDuration(mutations);
};

/**
 * Starts mutations observer
 */
const startDOMObserver = () => {
    const observer = new MutationObserver(doAfterMutation);
    const config = { childList: true, subtree: true };
    observer.observe(document, config);
};

(() => {
    'use strict';
    startDOMObserver();
    document.addEventListener('keydown', logKey);
})();

function consoleGlobals() {
    console.log('#YtGr4 globals:', metaData);
}

/**
 * Creates a modal overlay for full-size image preview.
 *
 * @param {string} imageSrc The base64 image source
 * @param {string} imageTitle The title/filename for the image
 * @returns {HTMLDivElement} Modal container element
 */
const createImageModal = (imageSrc, imageTitle) => {
    const modal = document.createElement('div');
    modal.id = 'image-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease-in-out';
    modal.style.cursor = 'pointer';

    // Modal content container
    const modalContent = document.createElement('div');
    modalContent.style.position = 'relative';
    modalContent.style.maxWidth = '95%';
    modalContent.style.maxHeight = '95%';
    modalContent.style.textAlign = 'center';

    // Full-size image
    const fullImage = document.createElement('img');
    fullImage.src = imageSrc;
    fullImage.style.maxWidth = '100%';
    fullImage.style.maxHeight = '100%';
    fullImage.style.objectFit = 'contain';
    fullImage.style.borderRadius = '8px';
    fullImage.style.border = '2px solid rgba(100, 149, 237, 0.5)';
    fullImage.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';

    // Image title overlay
    const titleOverlay = document.createElement('div');
    titleOverlay.style.position = 'absolute';
    titleOverlay.style.bottom = '10px';
    titleOverlay.style.left = '50%';
    titleOverlay.style.transform = 'translateX(-50%)';
    titleOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    titleOverlay.style.color = 'white';
    titleOverlay.style.padding = '8px 16px';
    titleOverlay.style.borderRadius = '4px';
    titleOverlay.style.fontSize = '14px';
    titleOverlay.style.fontFamily = 'Arial, sans-serif';
    titleOverlay.textContent = imageTitle || 'Screenshot Preview';

    // Close button
    const closeButton = document.createElement('div');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.fontSize = '30px';
    closeButton.style.color = 'white';
    closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    closeButton.style.width = '40px';
    closeButton.style.height = '40px';
    closeButton.style.borderRadius = '50%';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.cursor = 'pointer';
    closeButton.style.transition = 'background-color 0.2s';

    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });

    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    });

    modalContent.appendChild(fullImage);
    modalContent.appendChild(titleOverlay);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);

    return modal;
};

/**
 * Shows the image modal with fade-in animation.
 *
 * @param {HTMLDivElement} modal The modal element to show
 */
const showModal = modal => {
    document.body.appendChild(modal);
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
};

/**
 * Hides and removes the image modal.
 *
 * @param {HTMLDivElement} modal The modal element to hide
 */
const hideModal = modal => {
    modal.style.opacity = '0';
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
};

/**
 * Handles click on image to open modal preview.
 *
 * @param {Event} event Click event on the image
 */
const openImageModal = event => {
    event.preventDefault();
    event.stopPropagation();

    const imageElement = event.target;
    const imageSrc = imageElement.src;

    const imageContainer = imageElement.closest('[id^="screenshot-"]');
    const frameTimeAttr = imageContainer ? imageContainer.id.split('-').pop() : '0';
    const imageTitle = `Screenshot at ${frameTimeAttr}s`;

    const modal = createImageModal(imageSrc, imageTitle);

    modal.addEventListener('click', () => {
        hideModal(modal);
    });

    const escHandler = event => {
        if (event.key === 'Escape') {
            hideModal(modal);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    showModal(modal);
};
