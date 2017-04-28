/**
# imgSrc
Copyright ©2016-2017 Tonio Loewald

    imgSrc(img, url)

Gracefully populates an `<img>` element's src attribute to a url,
sets the element to `opacity: 0`, and then fads it in when the image
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
  if(img.src === url) {
    return;
  }
  if(!getComputedStyle(img).transition) {
    img.style.transition = '0.25s ease-out';
  }
  img.style.opacity = 0;
  if (url) {
    imagePromise(url).then(image => {
      if (img.src !== url) {
        img.style.opacity = opacity || 1;
        img.setAttribute('src', image.src);
      }
    });
  } else {
    img.removeAttribute('src');
  }
};

module.exports = imgSrc;
