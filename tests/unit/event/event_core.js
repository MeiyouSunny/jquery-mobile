/*
 * Mobile event unit tests
 */

define( [ "jquery", "qunit" ], function( $, QUnit ) {

var libName = "jquery.mobile.events.js",
	components = [ "events/touch.js", "events/throttledresize.js", "events/scroll.js",
		"events/orientationchange.js" ],
	absFn = Math.abs,
	originalEventFn = $.Event.prototype.originalEvent,
	preventDefaultFn = $.Event.prototype.preventDefault,
	events = ( "touchstart touchmove touchend tap taphold " +
	"swipe swipeleft swiperight scrollstart scrollstop orientationchange" ).split( " " );

QUnit.module( libName, {
	setup: function() {

		// Ensure bindings are removed
		$.each( events.concat( "vmouseup vmousedown".split( " " ) ), function() {
			$( "#qunit-fixture" ).unbind();
		} );

		// Make sure the event objects respond to touches to simulate
		// the collections existence in non touch enabled test browsers
		$.Event.prototype.touches = [ { pageX: 1, pageY: 1 } ];

		$( "body" ).unbind( "throttledresize" );
	},
	teardown: function() {

		// NOTE unmock
		Math.abs = absFn;
		$.Event.prototype.originalEvent = originalEventFn;
		$.Event.prototype.preventDefault = preventDefaultFn;
	}
} );

QUnit.asyncTest( "defined event functions bind a closure when passed", function( assert ) {
	assert.expect( 1 );

	$( "#qunit-fixture" ).bind( events[ 0 ], function() {
		assert.ok( true, "event fired" );
		QUnit.start();
	} );

	$( "#qunit-fixture" ).trigger( events[ 0 ] );
} );

QUnit.asyncTest( "defined event functions trigger the event with no arguments", function( assert ) {
	assert.expect( 1 );

	$( "#qunit-fixture" ).bind( "touchstart", function() {
		assert.ok( true, "event fired" );
		QUnit.start();
	} );

	$( "#qunit-fixture" ).touchstart();
} );

// JQuery < 1.8
if ( $.attrFn ) {
	QUnit.test( "defining event functions sets the attrFn to true", function( assert ) {
		$.each( events, function( index, name ) {
			assert.ok( $.attrFn[ name ], "attribute function is true" );
		} );
	} );
}

QUnit.asyncTest( "scrollstart setup binds a function that returns when its disabled", function( assert ) {
	assert.expect( 1 );
	$.event.special.scrollstart.enabled = false;

	$( "#qunit-fixture" ).bind( "scrollstart", function() {
		assert.ok( false, "scrollstart fired" );
	} );

	$( "#qunit-fixture" ).bind( "touchmove", function() {
		assert.ok( true, "touchmove fired" );
		QUnit.start();
	} );

	$( "#qunit-fixture" ).trigger( "touchmove" );
} );

QUnit.asyncTest( "scrollstart setup binds a function that triggers scroll start when enabled", function( assert ) {
	$.event.special.scrollstart.enabled = true;

	$( "#qunit-fixture" ).bind( "scrollstart", function() {
		assert.ok( true, "scrollstart fired" );
		QUnit.start();
	} );

	$( "#qunit-fixture" ).trigger( "touchmove" );
} );

QUnit.asyncTest( "scrollstart setup binds a function that triggers scroll stop after 50 ms", function( assert ) {
	var triggered = false;
	$.event.special.scrollstart.enabled = true;

	$( "#qunit-fixture" ).bind( "scrollstop", function() {
		triggered = true;
	} );

	assert.ok( !triggered, "not triggered" );

	$( "#qunit-fixture" ).trigger( "touchmove" );

	setTimeout( function() {
		assert.ok( triggered, "triggered" );
		QUnit.start();
	}, 50 );
} );

var forceTouchSupport = function() {
	document.ontouchend = function() {};
	$.testHelper.reloadLib( "support/touch.js" );
	$.each( components, function( index, value ) {
		$.testHelper.reloadLib( value );
	} );

	// Mock originalEvent information
	$.testHelper.mockOriginalEvent( {
		touches: [ { "pageX": 0 }, { "pageY": 0 } ]
	} );
};

QUnit.asyncTest( "long press fires tap hold after taphold duration", function( assert ) {
	var taphold = false,
		target;

	forceTouchSupport();

	$( "#qunit-fixture" ).bind( "taphold", function( e ) {
		taphold = true;
		target = e.target;
	} );

	$( "#qunit-fixture" ).trigger( "vmousedown" );

	setTimeout( function() {
		assert.ok( !taphold, "taphold not fired" );
		assert.deepEqual( target, undefined, "taphold target should be #qunit-fixture" );
	}, $.event.special.tap.tapholdThreshold - 10 );

	setTimeout( function() {
		assert.ok( taphold, "taphold fired" );
		assert.equal( target, $( "#qunit-fixture" ).get( 0 ), "taphold target should be #qunit-fixture" );
		QUnit.start();
	}, $.event.special.tap.tapholdThreshold + 10 );
} );

// NOTE used to simulate movement when checked
// TODO find a better way ...
var mockAbs = function( value ) {
	Math.abs = function() {
		return value;
	};
};

QUnit.asyncTest( "move prevents taphold", function( assert ) {
	assert.expect( 1 );
	var taphold = false;

	forceTouchSupport();
	mockAbs( 100 );

	// NOTE record taphold event
	$( "#qunit-fixture" ).bind( "taphold", function() {
		assert.ok( false, "taphold fired" );
		taphold = true;
	} );

	// NOTE start the touch events
	$( "#qunit-fixture" ).trigger( "vmousedown" );

	// NOTE fire touchmove to push back taphold
	setTimeout( function() {
		$( "#qunit-fixture" ).trigger( "vmousecancel" );
	}, 100 );

	// NOTE verify that the taphold hasn't been fired
	//		 with the normal timing
	setTimeout( function() {
		assert.ok( !taphold, "taphold not fired" );
		QUnit.start();
	}, 751 );
} );

QUnit.asyncTest( "tap event fired without movement", function( assert ) {
	assert.expect( 1 );
	var checkTap = function() {
			assert.ok( true, "tap fired" );
		};

	forceTouchSupport();

	// NOTE record the tap event
	$( "#qunit-fixture" ).bind( "tap", checkTap );

	$( "#qunit-fixture" ).trigger( "vmousedown" );
	$( "#qunit-fixture" ).trigger( "vmouseup" );
	$( "#qunit-fixture" ).trigger( "vclick" );

	setTimeout( function() {
		QUnit.start();
	}, 400 );
} );

QUnit.asyncTest( "tap event not fired when there is movement", function( assert ) {
	assert.expect( 1 );
	var tap = false;
	forceTouchSupport();

	// NOTE record tap event
	$( "#qunit-fixture" ).bind( "tap", function() {
		assert.ok( false, "tap fired" );
		tap = true;
	} );

	// NOTE make sure movement is recorded
	mockAbs( 100 );

	// NOTE start and move right away
	$( "#qunit-fixture" ).trigger( "touchstart" );
	$( "#qunit-fixture" ).trigger( "touchmove" );

	// NOTE end touch sequence after 20 ms
	setTimeout( function() {
		$( "#qunit-fixture" ).trigger( "touchend" );
	}, 20 );

	setTimeout( function() {
		assert.ok( !tap, "not tapped" );
		QUnit.start();
	}, 40 );
} );

QUnit.asyncTest( "tap event propagates up DOM tree", function( assert ) {
	var tap = 0,
		$qf = $( "#qunit-fixture" ),
		$doc = $( document ),
		docTapCB = function() {
			assert.deepEqual( ++tap, 2, "document tap callback called once after #qunit-fixture callback" );
		};

	$qf.bind( "tap", function() {
		assert.deepEqual( ++tap, 1, "#qunit-fixture tap callback called once" );
	} );

	$doc.bind( "tap", docTapCB );

	$qf.trigger( "vmousedown" )
		.trigger( "vmouseup" )
		.trigger( "vclick" );

	// Tap binding should be triggered twice, once for
	// #qunit-fixture, and a second time for document.
	assert.deepEqual( tap, 2, "final tap callback count is 2" );

	$doc.unbind( "tap", docTapCB );

	QUnit.start();
} );

QUnit.asyncTest( "stopPropagation() prevents tap from propagating up DOM tree", function( assert ) {
	var tap = 0,
		$qf = $( "#qunit-fixture" ),
		$doc = $( document ),
		docTapCB = function() {
			assert.ok( false, "tap should NOT be triggered on document" );
		};

	$qf.bind( "tap", function( e ) {
		assert.deepEqual( ++tap, 1, "tap callback 1 triggered once on #qunit-fixture" );
		e.stopPropagation();
	} )
		.bind( "tap", function( ) {
			assert.deepEqual( ++tap, 2, "tap callback 2 triggered once on #qunit-fixture" );
		} );

	$doc.bind( "tap", docTapCB );

	$qf.trigger( "vmousedown" )
		.trigger( "vmouseup" )
		.trigger( "vclick" );

	// Tap binding should be triggered twice.
	assert.deepEqual( tap, 2, "final tap count is 2" );

	$doc.unbind( "tap", docTapCB );

	QUnit.start();
} );

QUnit.asyncTest( "stopImmediatePropagation() prevents tap propagation and execution of 2nd handler", function( assert ) {
	var tap = 0,
		$cf = $( "#qunit-fixture" ),
		$doc = $( document ),
		docTapCB = function() {
			assert.ok( false, "tap should NOT be triggered on document" );
		};

	// Bind 2 tap callbacks on qunit-fixture. Only the first
	// one should ever be called.
	$cf.bind( "tap", function( e ) {
		assert.deepEqual( ++tap, 1, "tap callback 1 triggered once on #qunit-fixture" );
		e.stopImmediatePropagation();
	} )
		.bind( "tap", function() {
			assert.ok( false, "tap callback 2 should NOT be triggered on #qunit-fixture" );
		} );

	$doc.bind( "tap", docTapCB );

	$cf.trigger( "vmousedown" )
		.trigger( "vmouseup" )
		.trigger( "vclick" );

	// Tap binding should be triggered once.
	assert.deepEqual( tap, 1, "final tap count is 1" );

	$doc.unbind( "tap", docTapCB );

	QUnit.start();
} );

var swipeTimedTest = function( assert, opts ) {
	var origHandlerCount,
		origHandleSwipe = $.event.special.swipe.handleSwipe,
		handleSwipeAlwaysOnInner = true,
		swipe = false,
		bubble = false,
		qunitFixture = $( "#qunit-fixture" ),
		body = $( "body" ),
		dummyFunction = function() {},
		getHandlerCount = function( element ) {
			var index,
				eventNames = [ "touchstart", "touchmove", "touchend" ],
				returnValue = {},
				events = $._data( element, "events" );

			for ( index in eventNames ) {
				returnValue[ eventNames[ index ] ] = 0;
				if ( events && events[ eventNames[ index ] ] ) {
					returnValue[ eventNames[ index ] ] =
						( events[ eventNames[ index ] ].length || 0 );
				}
			}

			return returnValue;
		};

	forceTouchSupport();

	// Attach a dummy function to ensure that the swipe teardown leaves it attached
	body.add( qunitFixture )
		.on( "touchstart touchmove touchend", dummyFunction );

	// Count handlers - this will include the function added above
	origHandlerCount = {
		body: getHandlerCount( body[ 0 ] ),
		qunitFixture: getHandlerCount( qunitFixture[ 0 ] )
	};

	qunitFixture.one( "swipe", function() {
		swipe = true;
	} );

	body.one( "swipe", function() {
		bubble = true;
	} );

	// Instrument method handleSwipe
	$.event.special.swipe.handleSwipe =
		function( start, stop, thisObject ) {
			if ( thisObject !== qunitFixture[ 0 ] ) {
				handleSwipeAlwaysOnInner = false;
			}
			return origHandleSwipe.apply( this, arguments );
		};

	// NOTE bypass the trigger source check
	$.testHelper.mockOriginalEvent( {
		touches: [ {
			clientX: 0,
			clientY: 0
		} ]
	} );

	qunitFixture.trigger( "touchstart" );

	// NOTE make sure the coordinates are calculated within range
	//		 to be registered as a swipe
	mockAbs( opts.coordChange );

	setTimeout( function() {
		qunitFixture.trigger( "touchmove" );
		qunitFixture.trigger( "touchend" );
	}, opts.timeout + 100 );

	setTimeout( function() {
		assert.deepEqual( swipe, opts.expected, "swipe expected" );
		assert.deepEqual( bubble, opts.expected, "swipe bubbles when present" );
		assert.deepEqual( handleSwipeAlwaysOnInner, true, "handleSwipe is always called on the inner element" );

		// Make sure swipe handlers are removed in case swipe never fired
		qunitFixture.off( "swipe" );
		$( "body" ).off( "swipe" );

		assert.deepEqual( {
			body: getHandlerCount( body[ 0 ] ),
			qunitFixture: getHandlerCount( qunitFixture[ 0 ] )
		}, origHandlerCount, "exactly the swipe-related event handlers are removed." );

		// Remove dummy event handler
		body.add( qunitFixture )
			.off( "touchstart touchmove touchend", dummyFunction );
		QUnit.start();
	}, opts.timeout + 200 );

	QUnit.stop();
};

// This test is commented out until we can fix the rest of the file to not destroy prototypes
// The test no longer works because of false assumpitions and cant be fixed with current abuse
// of prototype changes
/*
QUnit.test( "swipe fired when coordinate change in less than a second", function( assert ){
	swipeTimedTest( assert,{ timeout: 10, coordChange: 35, expected: true });
});
*/

QUnit.test( "swipe not fired when coordinate change takes more than a second", function( assert ) {
	swipeTimedTest( assert, { timeout: 1000, coordChange: 35, expected: false } );
} );

QUnit.test( "swipe not fired when coordinate change <= 30", function( assert ) {
	swipeTimedTest( assert, { timeout: 1000, coordChange: 30, expected: false } );
} );

QUnit.test( "swipe not fired when coordinate change >= 75", function( assert ) {
	swipeTimedTest( assert, { timeout: 1000, coordChange: 75, expected: false } );
} );

QUnit.asyncTest( "scrolling prevented when coordinate change > 10", function( assert ) {
	assert.expect( 1 );

	forceTouchSupport();

	// Ensure the swipe custome event is setup
	$( "#qunit-fixture" ).bind( "swipe", function() {} );

	$.Event.prototype.preventDefault = function() {
		assert.ok( true, "prevent default called" );
		QUnit.start();
	};

	// NOTE bypass the trigger source check
	$.testHelper.mockOriginalEvent( {
		touches: [ {
			clientX: 0,
			clientY: 0
		} ]
	} );

	$( "#qunit-fixture" ).trigger( "touchstart" );

	// NOTE bypass the trigger source check
	$.testHelper.mockOriginalEvent( {
		touches: [ {
			clientX: 200,
			clientY: 0
		} ]
	} );

	$( "#qunit-fixture" ).trigger( "touchmove" );
} );

QUnit.test( "Swipe get cords returns proper values", function( assert ) {
	var location,
		event = {
			pageX: 100,
			pageY: 100,
			clientX: 300,
			clientY: 300
		};

	location = $.event.special.swipe.getLocation( event );
	assert.ok( location.x === 300 && location.y === 300, "client values returned under normal conditions" );
	event.pageX = 1000;
	event.pageY = 1000;
	location = $.event.special.swipe.getLocation( event );
	assert.ok( location.x > 300 && location.y > 300, "Fixes android bogus values" );
	event.pageX = 0;
	event.pageY = 0;
	location = $.event.special.swipe.getLocation( event );
	assert.ok( location.x <= 300 && location.y <= 300, "Fixes ios client values based on page" );

} );

var nativeSupportTest = function( assert, opts ) {
	$.support.orientation = opts.orientationSupport;
	assert.deepEqual( $.event.special.orientationchange[ opts.method ](), opts.returnValue );
};

QUnit.test( "orientation change setup should do nothing when natively supported", function( assert ) {
	nativeSupportTest( assert, {
		method: "setup",
		orientationSupport: true,
		returnValue: false
	} );
} );

QUnit.test( "orientation change setup should bind resize when not supported natively", function( assert ) {
	nativeSupportTest( assert, {
		method: "setup",
		orientationSupport: false,
		returnValue: undefined // NOTE result of bind function call
	} );
} );

QUnit.test( "orientation change teardown should do nothing when natively supported", function( assert ) {
	nativeSupportTest( assert, {
		method: "teardown",
		orientationSupport: true,
		returnValue: false
	} );
} );

QUnit.test( "orientation change teardown should unbind resize when not supported natively", function( assert ) {
	nativeSupportTest( assert, {
		method: "teardown",
		orientationSupport: false,
		returnValue: undefined // NOTE result of unbind function call
	} );
} );

/* The following 4 tests are async so that the throttled event triggers don't interfere with subsequent tests */

QUnit.asyncTest( "throttledresize event proxies resize events", function( assert ) {
	$( window ).one( "throttledresize", function() {
		assert.ok( true, "throttledresize called" );
		QUnit.start();
	} );

	$( window ).trigger( "resize" );
} );

QUnit.asyncTest( "throttledresize event prevents resize events from firing more frequently than one per 250ms", function( assert ) {
	var called = 0;

	$( window ).bind( "throttledresize", function() {
		called++;
	} );

	// NOTE 400 ms between two triggers and the check for one callback
	// is enough time for the first to fire but not enough for a second
	$.testHelper.sequence( [
		function() {
			$( window ).trigger( "resize" ).trigger( "resize" );
		},

		// Verify that only one throttled resize was called after 250ms
		function() {
			assert.deepEqual( called, 1 );
		},

		function() {
			QUnit.start();
		}
	], 400 );
} );

QUnit.asyncTest( "throttledresize event promises that a held call will execute only once after throttled timeout", function( assert ) {
	assert.expect( 2 );

	$.testHelper.eventSequence( "throttledresize", [

		// Ignore the first call
		$.noop,

		function() {
			assert.ok( true, "second throttled resize should run" );
		},

		function( timedOut ) {
			assert.ok( timedOut, "third throttled resize should not run" );
			QUnit.start();
		}
	] );

	$( "body" )
		.trigger( "resize" )
		.trigger( "resize" )
		.trigger( "resize" );
} );

QUnit.asyncTest( "mousedown mouseup and click events should add a which when its not defined", function( assert ) {
	var whichDefined = function( event ) {
		assert.deepEqual( event.which, 1 );
	};

	$( document ).bind( "vclick", whichDefined );
	$( document ).trigger( "click" );

	$( document ).bind( "vmousedown", whichDefined );
	$( document ).trigger( "mousedown" );

	$( document ).bind( "vmouseup", function( event ) {
		assert.deepEqual( event.which, 1 );
		QUnit.start();
	} );

	$( document ).trigger( "mouseup" );
} );
} );
