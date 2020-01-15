/**
# Firebase Integration

A simple integration with [Google Firebase](https://firebase.google.com).
The test application only allows authentication using Google and only allows
you to write documents to your own personal `/users/` document.

I haven't authorized any domains for the app, so it will only work from
`localhost` (unless you provide your own credentials, of course).

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
    <div data-bind="hide_if=_component_.user">
      <button data-event="click:_component_.signIn">Sign In</button>
    </div>
    <div class="user" data-bind="show_if=_component_.user">
      <img 
        class="avatar"
        data-bind="
          img=_component_.user.photoURL
          attr(title)=$\{_component_.user.displayName} <$\{_component_.user.email}>
        "
      >
      <button data-event="click:_component_.signOut">Sign Out</button>
    </div>
    <div data-bind="show_if=_component_.authError">
      <h4>Authentication Error</h4>
      <pre data-bind="json=_component_.authError"></pre>
    </div>
    <div data-bind="show_if=_component_.user">
      <h4>Stored Message</h4>
      <textarea 
        data-bind="value=_component_.userDoc.message"
        data-event="input:_component_.markDirty"
      ></textarea>
      <div>
        last saved 
        <span data-bind="timestamp(h:MM:ss TT Z, mmmm d, yyyy)=_component_.userDoc.timestamp">
      </div>
      <button
        data-bind="enabled_if=_component_.dirty"
        data-event="click:_component_.saveMessage"
      >Save Message</button>
    </div>
  `,
  async initialValue ({ b8r, get, set }) {
    const { viaTag } = await import('../lib/scripts.js')
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
        set({ user })
        const db = firebase.firestore()
        db.collection('teams').where('assistant_coach', '==', 'Rosanna').get().then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            console.log(doc.id, doc.data())
          })
        })
        const userDoc = await db.collection('users').doc(get('user').uid).get()
        set({ userDoc: userDoc.data() })
      } else {
        set({
          token: null,
          user: null
        })
      }
    })

    return {
      token: null,
      user: null,
      authError: null,
      dirty: false,
      markDirty () {
        set({ dirty: true })
        return true
      },
      saveMessage () {
        set({ dirty: false })
        const db = firebase.firestore()
        const userDoc = get('userDoc')
        const timestamp = Date.now()
        db.collection('users').doc(get('user').uid).set({ ...userDoc, timestamp }).then((...args) => {
          set('userDoc.timestamp', timestamp)
        }).catch((error) => {
          set({ dirty: true })
          alert('Save failed!\n\n' + error)
        })
      },
      signOut () {
        firebase.auth().signOut().then(function () {
          set({
            token: null,
            user: null
          })
        }).catch((error) => {
          /* global alert */
          alert('Sign Out failed!\n\n' + error)
        })
      },
      signIn () {
        const provider = new firebase.auth.GoogleAuthProvider()
        firebase.auth().signInWithPopup(provider).then(function (result) {
          set({
            authError: null,
            token: result.credential.accessToken,
            user: result.user
          })
        }).catch(function (error) {
          set({
            authError: error
          })
        })
      }
    }
  }
}