// js/jsm/webxr/VRButton.js
export class VRButton {
	static createButton( renderer ) {
		const button = document.createElement( 'button' );
		function showEnterVR( /*device*/ ) {
			let currentSession = null;
			async function onSessionStarted( session ) {
				session.addEventListener( 'end', onSessionEnded );
				await renderer.xr.setSession( session );
				button.textContent = 'EXIT VR';
				currentSession = session;
			}
			function onSessionEnded( /*event*/ ) {
				currentSession.removeEventListener( 'end', onSessionEnded );
				button.textContent = 'ENTER VR';
				currentSession = null;
			}
			button.style.display = '';
			button.style.cursor = 'pointer';
			button.style.left = 'calc(50% - 50px)';
			button.style.width = '100px';
			button.textContent = 'ENTER VR';
			button.onmouseenter = () => button.style.opacity = '1.0';
			button.onmouseleave = () => button.style.opacity = '0.5';
			button.onclick = () => {
				if ( currentSession === null ) {
					const sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor' ] };
					navigator.xr.requestSession( 'immersive-vr', sessionInit ).then( onSessionStarted );
				} else {
					currentSession.end();
				}
			};
		}
		function disableButton() {
			button.style.display = '';
			button.style.cursor = 'auto';
			button.textContent = 'VR NOT SUPPORTED';
			button.onmouseenter = null;
			button.onmouseleave = null;
			button.onclick = null;
		}
		if ( 'xr' in navigator ) {
			button.id = 'VRButton';
			button.style.display = 'none';
			navigator.xr.isSessionSupported( 'immersive-vr' ).then( function ( supported ) {
				supported ? showEnterVR() : disableButton();
			} );
			return button;
		} else {
			const message = document.createElement( 'a' );
			message.href = 'https://immersiveweb.dev/';
			message.innerHTML = 'WEBXR NOT SUPPORTED';
			message.style.position = 'absolute';
			message.style.left = 'calc(50% - 90px)';
			message.style.width = '180px';
			message.style.textDecoration = 'none';
			message.style.color = '#fff';
			message.style.bottom = '20px';
			message.style.textAlign = 'center';
			message.style.opacity = '0.5';
			return message;
		}
	}
}
