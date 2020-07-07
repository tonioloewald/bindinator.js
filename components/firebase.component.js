/**
# Firebase Integration

A simple integration with [Google Firebase](https://firebase.google.com).
The test application only allows authentication using Google and only allows
you to write documents to your own personal `/users/` document.

The test applicaton is authorized to run from `localhost`,
`tonioloewald.github.io`, and `bindinator.com`.

```
<b8r-component path="../components/firebase.component.js"></b8r-component>
```
*/

export default {
  css: `
    ._component_ .user {
      display: flex;
      align-items: center;
    }
    ._component_ .avatar {
      width: 32px;
      height: 32px;
      border-radius: 99px;
      content-fit: cover;
    }
  `,
  html: `
    <div>
      <h3>Firebase</h3>
    </div>
    <div data-bind="show_if=firebase.canSignIn">
      <button data-event="click:firebase.signIn">Sign In</button>
    </div>
    <div class="user" data-bind="show_if=firebase.user">
      <img
        class="avatar"
        data-bind="
          img=firebase.user.photoURL
          attr(title)=$\{firebase.user.displayName} <$\{firebase.user.email}>
        "
      >
      <button data-event="click:firebase.signOut">Sign Out</button>
    </div>
    <div data-bind="show_if=firebase.authError">
      <h4>Authentication Error</h4>
      <pre data-bind="json=firebase.authError"></pre>
    </div>
    <div data-bind="show_if=firebase.user">
      <h4>Stored Message</h4>
      <textarea
        data-bind="value=firebase.userDoc.message"
        data-event="input:firebase.markDirty"
      ></textarea>
      <div>
        last saved 
        <span data-bind="timestamp(h:MM:ss TT Z, mmmm d, yyyy)=firebase.userDoc.timestamp">
      </div>
      <button
        data-bind="enabled_if=firebase.dirty"
        data-event="click:firebase.saveMessage"
      >Save Message</button>
    </div>
  `,
  async load ({ b8r }) {
    if (b8r.registered('firebase')) return

    const { viaTag } = await import('../lib/scripts.js')
    // FIXME: some of these are preventing the example running in iOS
    await viaTag('https://www.gstatic.com/firebasejs/7.6.0/firebase-app.js')
    await viaTag('https://www.gstatic.com/firebasejs/7.6.0/firebase-auth.js')
    await viaTag('https://www.gstatic.com/firebasejs/7.6.0/firebase-analytics.js')
    await viaTag('https://www.gstatic.com/firebasejs/7.6.0/firebase-firestore.js')
    // TODO: Add SDKs for Firebase products that you want to use

    /* global firebase */
    firebase.initializeApp({
      apiKey: 'AIzaSyCmqHTgpe-swzPrSyUmla7LSc0zKt1sXpE',
      authDomain: 'fir-test-f9d4b.firebaseapp.com',
      databaseURL: 'https://fir-test-f9d4b.firebaseio.com',
      projectId: 'fir-test-f9d4b',
      storageBucket: 'fir-test-f9d4b.appspot.com',
      messagingSenderId: '1046164725710',
      appId: '1:1046164725710:web:a8378f8106d8e24624559f',
      measurementId: 'G-77Q85VT60K'
    })
    firebase.analytics()
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        b8r.set('firebase', {
          user,
          canSignIn: false
        })
        const db = firebase.firestore()

        // fetching data from Firebase
        const userDoc = await db.collection('users').doc(user.uid).get()
        b8r.set('firebase.userDoc', userDoc.data())
      } else {
        b8r.set('firebase', {
          token: null,
          user: null,
          canSignIn: true
        })
      }
    })

    b8r.register('firebase', {
      token: null,
      user: null,
      authError: null,
      dirty: false,
      canSignIn: false,
      markDirty () {
        b8r.set('firebase.dirty', true)
        return true
      },
      saveMessage () {
        b8r.set('firebase.dirty', false)
        const db = firebase.firestore()
        const { user, userDoc } = b8r.get('firebase')
        // saving data to firebase
        const timestamp = Date.now()
        db.collection('users').doc(user.uid).set({ ...userDoc, timestamp }).then((...args) => {
          b8r.set('firebase.userDoc.timestamp', timestamp)
        }).catch((error) => {
          b8r.set('firebase.dirty', true)
          alert('Save failed!\n\n' + error)
        })
      },
      signOut () {
        firebase.auth().signOut().then(function () {
          b8r.set('firebase', {
            token: null,
            user: null,
            canSignIn: true
          })
        }).catch((error) => {
          /* global alert */
          alert('Sign Out failed!\n\n' + error)
        })
      },
      signIn () {
        const provider = new firebase.auth.GoogleAuthProvider()
        firebase.auth().signInWithPopup(provider).then(function (result) {
          b8r.set('firebase', {
            authError: null,
            token: result.credential.accessToken,
            user: result.user,
            canSignIn: false
          })
        }).catch(function (error) {
          b8r.set('firebase', {
            authError: error
          })
        })
      }
    })
  }
}
