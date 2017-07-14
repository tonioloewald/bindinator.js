/**
# imgSrc
Copyright ©2016-2017 Tonio Loewald

    imgSrc(img, url)

Gracefully populates an `<img>` element's src attribute to a url,
sets the element to `opacity: 0`, and then fades it in when the image
is loaded.
*/
/* global module */
'use strict';

const images = {};

const imagePromise = (url) => {
  if (!images[url]) {
    images[url]= new Promise((resolve) => {
      const image = new Image();
      image.src = url;
      image.onload = () => {
        resolve(image);
      };
    });
  }
  return images[url];
};

const imgSrc = (img, url, opacity) => {
  if(img instanceof HTMLImageElement && img.src === url) {
    return;
  }
  img.style.opacity = 0;
  if (url) {
    imagePromise(url).then(image => {
      if(!getComputedStyle(img).transition) {
        img.style.transition = '0.25s ease-out';
      }
      img.style.opacity = opacity || '';
      img.setAttribute('src', image.src);
      if (img instanceof HTMLCanvasElement) {
        img.width = img.offsetWidth;
        img.height = img.offsetHeight;
        const ctx = img.getContext('2d');
        const w = img.offsetWidth;
        const h = img.offsetHeight;
        const scale = Math.max(w / image.width, h / image.height);
        const sw = w / scale;
        const sh = h / scale;
        const sx = (image.width - sw) * 0.5;
        const sy = (image.height - sh) * 0.5;
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);
      }
    });
  } else {
    img.removeAttribute('src');
  }
};

imgSrc.imagePromise = imagePromise;

module.exports = imgSrc;
