export class VRButton {

	static createButton( renderer ) {

		const button = document.createElement( 'button' );

		function showEnterVR( device ) {

			let currentSession = null;

			async function onSessionStarted( session ) {

				session.addEventListener( 'end', onSessionEnded );

				await renderer.xr.setSession( session );
				button.textContent = 'EXIT VR';

				currentSession = session;

			}

			function onSessionEnded() {

				currentSession.removeEventListener( 'end', onSessionEnded );
				button.textContent = 'ENTER VR';

				currentSession = null;

			}

			button.style.display = '';
			button.style.cursor = 'pointer';
			button.style.left = 'calc(50% - 50px)';
			button.style.width = '100px';
			button.textContent = 'ENTER VR';

			button.onmouseenter = function () { button.style.opacity = '1.0'; };
			button.onmouseleave = function () { button.style.opacity = '0.5'; };

			button.onclick = function () {

				if ( currentSession === null ) {

					const sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor', 'hand-tracking' ] };
					navigator.xr.requestSession( 'immersive-vr', sessionInit ).then( onSessionStarted );

				} else {

					currentSession.end();

				}

			};

		}

		function disableButton() {

			button.style.display = '';
			button.style.cursor = 'auto';
			button.style.left = 'calc(50% - 75px)';
			button.style.width = '150px';
			button.textContent = 'VR NOT SUPPORTED';

			button.onmouseenter = null;
			button.onmouseleave = null;
			button.onclick = null;

		}

		function showWebXRNotFound() {
			disableButton();
		}

		function showVRNotAllowed( exception ) {
			disableButton();
			console.warn( 'Exception when trying to enable WebXR:', exception );
		}

		if ( 'xr' in navigator ) {

			button.id = 'VRButton';
			button.style.display = 'none';

			navigator.xr.isSessionSupported( 'immersive-vr' ).then( function ( supported ) {

				supported ? showEnterVR() : showWebXRNotFound();

			} ).catch( showVRNotAllowed );

			return button;

		} else {

			const message = document.createElement( 'a' );
			message.href = 'https://immersiveweb.dev/';
			message.innerHTML = 'WEBXR NOT SUPPORTED';
			message.style.left = 'calc(50% - 90px)';
			message.style.width = '180px';
			message.style.textDecoration = 'none';
			message.style.position = 'absolute';
			message.style.bottom = '20px';
			message.style.padding = '12px 6px';
			message.style.border = '1px solid #fff';
			message.style.borderRadius = '4px';
			message.style.background = 'rgba(0,0,0,0.1)';
			message.style.color = '#fff';
			message.style.font = 'normal 13px sans-serif';
			message.style.textAlign = 'center';
			message.style.opacity = '0.5';
			message.style.outline = 'none';
			message.style.zIndex = '999';
			message.style.cursor = 'pointer';
			message.target = '_blank';
			return message;

		}

	}

}
