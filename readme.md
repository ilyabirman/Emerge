Emerge – page load coordinator
==============================

Normally, when a web page loads, elements appear in random order, causing unpleasant flashing. With Emerge, you have fine control over this.

With Emerge, you don’t write Javascript. Instead, you specify the desired behavior declaratively. This includes order, timing, loading indicators and particular animations.

Setup and basic usage
---------------------

Add the following to the `<head>` of your page:

    <script src="/path/to/emerge.js"></script>

Now any element with `class="emerge"` will fade in after its contents are loaded:

    <div class="emerge">
      ... Show this only when it is ready ...
    </div>

Emerge takes care of all `<img />` tags and images used in CSS (backgrounds, list-style-images and so on), as well as videos inserted with the `<video />` tag.

If you link the script at the end of the document, add this to `<head>`:

    <style>.emerge { opacity: 0; }</style>


Loading indicators
------------------

Use `data-spin="true"` on the elements you want to display a loading indicator for:

    <div class="emerge" data-spin="true">
      ... Display a spinner while this is loading ...
    </div>

The following attributes control the spinner:

`data-spin-size="24"`  
Diameter in pixels. Default is 24.

`data-spin-color="#000"`  
Colour. Default is black.

`data-spin-direction="clockwise"`  
Rotation direction. Options: *clockwise* (default) and *counter-clockwise* 

To use a custom indicator, wrap it into a hidden div:

    <div id="custom-spinner" style="display: none">
      ... Custom loading indicator code ...
    </div>

And link it to the emerging element:

`data-spin-element="custom-spinner"`  
Use the contents of the div with id="custom-spinner" as a loading indicator 

Emerge clones the div for each element and sets appropriate width and height for it. So if you want the indicator to be centered, write the necessary code youself:

    <div id="custom-spinner" style="position: relative; display: none">
      <img src="data:image/..." width="24" height="24"
        style="position: absolute; left: 50%; top: 50%; margin: -12px"
      />
    </div>

To use spin.js, run it inside your hidden div.


Effects
-------

The following attributes are used to tune up the animation effects:

`data-effect="slide"`  
A built-in effect to use. The built-in effects are: relax, slide, zoom and screw. 

`data-duration="500"`  
The animation duration in milliseconds. Default is 500 milliseconds. 

`data-up="20px"` or `data-down="5em"`  
For slide effect, how much to slide element up or down. Default slide is 20 pixels up. Using both of these attributes makes no sense. 

`data-left="10%"` or `data-right="5cm"`  
For slide effect, how much to slide element left or right. Default is zero, i.e. no horizontal slide. Using both of these attributes makes no sense. 

`data-scale="0.5"`  
For relax, zoom and screw effects, the initial scale. The default is 0.92 for relax and 0.5 for zoom and screw. 

`data-angle="90"`  
For screw effect, the initial angle in degrees. Default is 90 degrees. Use negative values to change the rotation direction. 

`data-origin="top"`  
For relax, zoom and screw effects, the transformation origin. Default is ”top” for relax and ”center center” for zoom and screw. 

`data-opaque="true"`  
All built-in effects include fade from fully transparent to fully opaque. Use this attribute if you want element to be opaque initially (like if you want it to move in from a side). 

`data-style-1`  
`data-style-2`  
Use custom CSS for transitions (see examples below). These attributes will be ignored if data-effect is used. 

Example:

    <div class="emerge" data-effect="slide">
      ... Something you want to emerge by sliding ...
    </div>

Using other data-attributes to tune the animation:

    <div class="emerge"
      data-effect="relax" data-scale=".5" data-origin="bottom"
    >
      ... Stuff to vertically grow from its half-height ...
    </div>

Using custom CSS (double check what prefixes you use):

    <div class="emerge"
      data-opaque="true"
      data-style-1="-webkit-transform: rotate3d(1,1,0,90deg)"
      data-style-2="-webkit-transform: rotate3d(0,0,0,0);
        transition: opacity .5s ease-out,
          -webkit-transform 2s cubic-bezier(0.0, 0.0, 0.001, 1.0)"
    >
      ... Wow, unbelievable transition ...
    </div>


Order and timing
----------------

Sometimes you want an element to wait for another element before emerging. The following attributes are used for this:

`data-await="element-id"`  
Wait for element with id="element-id" to load (but not finish the animation). The awaited element should also have class="emerge", otherwise this will be ignored. You can specify only one element here, but that one element can in turn wait for some other element. 

`data-continue="true"`  
Wait for previous element with class="emerge" (by HTML order) to load (but not finish the animation). This is the same as using data-await with the previous element’s id, except that you do not need to assign an id to that element (easier!). This attribute is ignored if data-await is used. 

`data-hold="500"`  
Hold on for this number of milliseconds (at least this much time should elapse after an element, which the given one was waiting for, have started emerging). 

`data-expose="true"`  
Wait until the user scrolls to the element. If a hold time is set, it is calculated from the moment when the element gets into view. 

Example:

    <div class="emerge">
      ... Hey...
    </div>
    <div class="emerge" data-continue="true">
      ... Wait for the previous element to emerge first ...
    </div>

Slightly more sophisticated example:

    <div class="emerge" data-await="thing" data-hold="500">
      ... Wait for “thing”, then hold on for 500 ms and emerge ...
    </div>
    <div class="emerge" id="thing">
      ... This one will emerge first ...
    </div>

To make elements emerge simultaneously no matter which one loads first, make them wait for each other:

    <div class="emerge" id="one" data-await="two">
      ... Emerge simultaneously with the next one ...
    </div>
    <div class="emerge" id="two" data-await="one">
      ... Emerge simultaneously with the previous one ...
    </div>


Video ready event
-----------------

By default, Emerge will wait for videos to fully load before considering them ready (i.e. wait for the canplaythrough event). Use data-emerge-event attribute on the video to change this event, i. e.:

    <video ... data-emerge-event="loadedmetadata">
      ...
    </video>

See MDN for [Media events](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events).


Replay
------

Add `class="emerge-replay"` to any element to make it replay all page animations on click:

    <a href="#" class="emerge-replay">Replay</a>

This is particularly useful for debugging your animations.


### Browser requirements

Latest Webkit browsers and Firefox fully supported. In unsupported browsers page will load as if there were no Emerge in the first place. Same thing with disabled Javascript.