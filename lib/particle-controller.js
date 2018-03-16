/**
# particle-controller

full-screen particles for fun and profit

Usage:

    const ps = require('particle-controller.js');
    ps.spawnAt(event.clientX, event.clientY, "👍");


*/

/* global THREE, TWEEN, require */
'use strict';

const b8r = require('../source/b8r.js');
const particleController = {};
  const charCanvas = char => {
      var canvas = document.createElement( 'canvas' );
      canvas.width = 64;
      canvas.height = 64;
      var g = canvas.getContext( '2d' );
      g.font = '60px sans-serif';
      g.textAlign = 'center';
      g.fillText(char, 32, 60);
      return canvas;
  };

  let camera, scene;
  const initParticles = ( { delay, start, scale, velocity }, particle, ...nextParticles ) => {
    particle = this instanceof THREE.Sprite ? this : particle;
    delay = delay !== undefined ? delay : 0;
    particle.position.set( start.x, start.y, start.z );
    particle.scale.x = particle.scale.y = scale;
    new TWEEN.Tween( particle )
      .delay( delay )
      .to( {}, 2000 )
      .onComplete(p => {
        // Would be nice if this crossfaded into the next particle, but I didn't see an obvious
        // way to tween the opacity of the sprite. Tweening opacity on the material makes things
        // flicker while fading in because all sprites of the same type share the same material.
        // If you make a material for each sprite, the animation becomes jerky.
        scene.remove(p)
        nextParticles.length && initParticles({
            delay: 0,
            start: p.position,
            scale: p.scale.x,
            velocity: velocity
          },
          ...nextParticles)
      })
      .start();
    new TWEEN.Tween( particle.position )
      .delay( delay )
      .to( {
        x: start.x + velocity.x,
        y: start.y + velocity.y,
        z: start.z + velocity.z
      }, 2000 )
      .start();
    if ( ! nextParticles.length) {
      new TWEEN.Tween( particle.material )
        .delay( delay )
        .to( {opacity: 0}, 2000 )
        .start();
    }
    scene.add(particle)
  };

  require.lazy('../third-party/three.min.js').
  then(() => require.lazy('../third-party/Tween.min.js')).
  then(() => {
    const aspect_ratio = window.innerWidth/window.innerHeight;
    camera = new THREE.PerspectiveCamera( 90, aspect_ratio, 1, 5000 );
    camera.position.z = 1000;

    scene = new THREE.Scene();
    camera.lookAt( scene.position );
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    const canvas = renderer.domElement;

    const render = () => {
      if(b8r.isInBody(renderer.domElement)) {
        TWEEN.update();
        renderer.render( scene, camera );
        if (scene.children.length) {
          requestAnimationFrame(render);
        }
      }
    };

    Object.assign(particleController, {
      spawnAt: (x, y, glyphs, howmany=25, scale=48) => {
        document.body.appendChild( canvas );
        // initialize camera projection
        render();
        const vector = new THREE.Vector3();
        vector.set(
            ( x / window.innerWidth ) * 2 - 1,
            - ( y / window.innerHeight ) * 2 + 1,
            0 );

        vector.unproject(camera);
        const projection_distance = camera.position.z / (camera.position.z - vector.z);
        const pos = vector.clone().multiplyScalar(projection_distance);
        pos.z = 0

        const materials = (glyphs.map ? glyphs : [glyphs])
          .map(g => {
            const c = g instanceof HTMLCanvasElement ? g : charCanvas(g),
                  t = new THREE.CanvasTexture(c)
            return new THREE.SpriteMaterial({map: t})
          })

        for (let i = 0; i < howmany; i++ ) {
          const particles = materials.map(m => new THREE.Sprite(m))
          const randomSize = Math.random() * scale + scale / 2
          initParticles( {
              delay: i * 50,
              start: pos,
              scale: randomSize,
              velocity: {
                x: Math.random() * 200 * randomSize/48 - 100,
                y: Math.random() * 300 * randomSize/48 + 200,
                z: Math.random() * 100 * randomSize/48
              }
            }, ...particles );
        }
        render()
      },
    });

    b8r.register('particle-controller', particleController);

    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    canvas.classList.add('particle-controller')
    Object.assign(canvas.style, {
      position: 'fixed',
      left: 0,
      top: 0,
      pointerEvents: 'none',
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize( window.innerWidth, window.innerHeight );
    });
  });

  module.exports = particleController;
