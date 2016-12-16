/**
# imgSrc

    imgSrc(img, url)

Gracefully populates an `<img>` element's src attribute to a url,
sets the element to `opacity: 0`, and then fads it in when the image
is loaded.
*/

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