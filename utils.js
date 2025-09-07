function isValidPhotoUrl(url) {
    return url && (url.startsWith('http') || url.startsWith('https'));
}

function isValidVideoUrl(url) {
    return url && (url.startsWith('http') || url.startsWith('https'));
}

function isImageUrl(url) {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
}

function isVideoUrl(url) {
    return /\.(mp4|mov|avi|webm|mkv)$/i.test(url);
}

module.exports = {
    isValidPhotoUrl,
    isValidVideoUrl,
    isImageUrl,
    isVideoUrl
};