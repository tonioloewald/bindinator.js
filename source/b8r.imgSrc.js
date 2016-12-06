module.exports = function imageSrc(img, url){
  if(!getComputedStyle(img).transition) {
    img.style.transition = '0.25s ease-out';
  }
  if (url && img.getAttribute('src') !== url) {
    const image = new Image();
    img.style.opacity = 0;
    image.src = url;
    image.onload = () => img.style.opacity = 1;
    img.setAttribute('src', url);
  }
}