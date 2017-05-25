//! v.1.3.1, http://ilyabirman.net/projects/emerge/

if (jQuery) {
  
  (function ($) {

    $ (function () {
      
      var queue, elementsFired, elementsOnHold, watchingScrolling

      var defaultDuration = 500
      var cssImageProps = [
        'backgroundImage',
        'borderImage',
        'borderCornerImage',
        'listStyleImage',
        'cursor'
      ]
      var cssUrlRegex = /url\(\s*(['"]?)(.*?)\1\s*\)/g
      var animationNameIndex = 0

      var cached = function (src) {
        var img = new Image ()
        img.src = src
        log ((img.complete? 'cached' : 'uncached') + ': ' + img.src) //:dev
        return img.complete
      }
      
      var spinnerCode = function (radius, color, backwards, period, fadeDuration) {
        var animationName = 'emergeRotate' + (++ animationNameIndex)
        return (
          '<style>' +
          '@keyframes ' + animationName + ' { ' +
          'from { transform: rotate(' + (backwards*360) + 'deg) } ' + 
          'to { transform: rotate(' + (!backwards*360) + 'deg) } ' +
          ' } ' +
          '</style>' +
          '<div style="position: absolute; transition: opacity ' + fadeDuration + 'ms ease-out">' +
          '<div style="position: absolute; left: 50%; top: 50%; margin: -' + radius + 'px">'+
          '<svg width="' + (radius*2) + '" height="' + (radius*2) + '"' +
          'viewBox="0 0 100 100">' +
          '<defs><mask id="cut"><rect width="100" height="100" fill="white" />' +
          '<circle r="40" cx="50" cy="50" fill="black" />' +
          '<polygon points="50,50 100,25 150,50 100,75" fill="black" style="' +
          'transform-origin: left center; ' +
          'animation: ' + animationName + ' ' + period + 'ms linear infinite' +
          '" /></mask></defs>'+
          '<circle r="50" cx="50" cy="50" mask="url(#cut)" fill="' + color + '" />'+
          '</svg>' + 
          '</div>' + 
          '</div>'
        )
      }
    
      var log = function (txt) {  //:dev
        if (1) console.log (txt)  //:dev
      }                           //:dev

      var withinView = function ($el) {
        // log ('________ noview: ' + $el[0].id) //:dev
        // log ('________ window height = ' + document.body.clientHeight) //:dev
        // log ('________ window height = ' + document.documentElement.clientHeight) //:dev
        // log ('________ element top = ' + ($el.offset ().top - document.body.scrollTop)) //:dev
        var bodyHeight = Math.min (
          document.body.clientHeight, document.documentElement.clientHeight
        )
        var position = $el.offset ().top;
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return (position - scrollTop) < bodyHeight
      }

      // calling fire means:
      // element $el is has all content loaded and can be shown,
      // also there is no other element that prevents it from being shown,
      // so check if it has its own limitations like hold timeout or scrolling
      var fire = function ($el, shouldGo) {
    
        var hold = $el.data ('hold')
        var expose = $el.data ('expose')
        
        if (expose && !withinView ($el)) {
          $el.data ('_waitingForView', true)
          log ('on expose: ' + $el[0].id + ' (' + expose + ')') //:dev
          return false
        }

        if (expose) {
          log ('in view: ' + $el[0].id)  //:dev
        }
        
        if (hold && (-1 === $.inArray ($el, elementsOnHold))) {
          elementsOnHold.push ($el)
          log ('   hold: ' + $el[0].id + ' (' + hold + ' ms)') //:dev
          setTimeout (function () {
            log ('TIME') //:dev
            fire ($el, true)
          }, hold)
          return false
        }

        if ((-1 !== $.inArray ($el, elementsOnHold)) && !shouldGo) {
          log ('on hold: ' + $el[0].id) //:dev
          return false
        }

        var $spinElement = $el.data ('_spinner')
        if ($spinElement) {
          $spinElement.css ('opacity', 0)
          setTimeout (function () {
            $spinElement.remove ()
          }, defaultDuration)
        }
        
        $el.css ('transition', 'opacity ' + defaultDuration + 'ms ease-out')
        $el.css ('opacity', '1')
            
        var style2 = $el.data ('style-2')
        if (style2) {
          $el.attr ('style', $el.attr ('style') + '; '  + style2)
        }
    
        log ('  FIRED! ' + $el[0].id) //:dev
        elementsFired.push ($el)
    
        arm ()
        
      }
      
      // calling arm means:
      // element $which has all content loaded and can be shown,
      // but maybe there are other elements which it waits for
      var arm = function ($which) {
        if ($which) {
          log ('ARM:     ' + $which[0].id) //:dev
          queue.push ($which)
        } else { //:dev
          log ('ARM') //:dev
        }

        /*
        var queueStr = '' //:dev
        for (var i in queue) { //:dev
          queueStr += queue[i][0].id + ' ' //:dev
        } //:dev
        log ('  queue: ' + queueStr) //:dev
        */

        for (var i in queue) {
          var $el = queue[i]
          
          if (-1 !== $.inArray ($el, elementsFired)) {

            log ('  fired earlier: ' + $el[0].id)  //:dev
            // log (elementsFired)  //:dev
    
          } else {
            
            var $test_el
            var deadlock = false
            
            if ($test_el = $el.data ('_waitFor')) {
    
              if (-1 === $.inArray ($el, elementsOnHold)) {      //:dev 
                log ('  waits: ' + $el[0].id)                    //:dev
              }                                                  //:dev

              // check for a deadlock
              while (1) {
                if (-1 === $.inArray ($test_el, elementsFired)) {

                  log ('     for ' + $test_el[0].id) //:dev
                  
                  if ($test_el[0] == $el[0]) {
                    log ('  FUCK, WE HAVE A DEADLOCK!') //:dev
                    deadlock = true
                    break
                  }
                  if ($test_el = $test_el.data ('_waitFor')) {
                    continue
                  }
                }
                break
              }
              
              if (
                (-1 !== $.inArray ($el.data ('_waitFor'), elementsFired))
                || deadlock
              ) {
                fire ($el)
              }
              
            } else {
              fire ($el)
            }
          }
          
        }
        
        log ('IDLE') //:dev

      }

      // does stuff when scrolled
      var scrolled = function () {
        for (var i in queue) {
          var $el = queue[i]
          if ($el.data ('_waitingForView') && withinView ($el)) {
            log ('SCROLLED') //:dev
            $el.data ('_waitingForView', false)
            fire ($el)
          }
        }
      }
      
      // starts watching scrolling
      var watchScrolling = function () {
        if (!watchingScrolling) {
          $ (window).on ('scroll resize', scrolled)
          watchingScrolling = true
          log ('now watching scrolling') //:dev
        }
      }

      var play = function () {

        queue = []
        elementsFired = []
        elementsOnHold = []
        watchingScrolling = false

        var $prev = false

        $ ('.emerge').each (function () {
      
          var $self = $ (this)
          var innerImagesSrcs = {}
          var innerItems = []
          var spin = false
          var spinnerRadius = 12
          var spinnerPeriod = 1333
          var spinnerColor = '#404040'
          var spinnerBackwards = 0
          var spinnerFadeDuration = defaultDuration
          var elementsCount = 0
          var elementsLoaded = 0
          var style1 = ''
          var style2 = ''
          var duration = defaultDuration
          var effect = {}
          
          $self.$prev = $prev
          
          var enqueue = function () {
      
            if ($self.data ('continue')) {
              $self.data ('_waitFor', $self.$prev)
            }
            
            if ($self.data ('await')) {
              $self.data ('_waitFor', $ ('#' + $self.data ('await')))
            }
            
            if ($self.data ('_waitFor')) { //:dev
              log ('         ' + $self[0].id + ' will wait for ' + $self.data ('_waitFor')[0].id) //:dev
            } //:dev

            arm ($self)
            
          }
          
          var element = function () {
            
            elementsLoaded ++
            
            if (elementsLoaded == elementsCount) {
              setTimeout (enqueue, $self.data ('slow'))
            }
            
          }
          
          if ($self.data ('opaque')) {
            $self.css ('opacity', 1)
          }
          
      
          // if an effect is set, use it
      
          effect = $self.data ('effect') || false
          duration = $self.data ('duration') || defaultDuration

          expose = $self.data ('expose')

          if (expose) { //:dev
            // log ('expose element: ' + $self[0].id) //:dev
            watchScrolling ()
          } //:dev

          if (effect) {
      
            var fxData = {}
            // var cssTransform = '-webkit-transform'
            // var cssTransformOrigin = '-webkit-transform-origin'
            var cssPrefixes = ['', '-webkit-']
            var cssTransform = 'transform'
            var cssTransformOrigin = 'transform-origin'
            var up = $self.data ('up') || 0
            var down = $self.data ('down') || 0
            var left = $self.data ('left') || 0
            var right = $self.data ('right') || 0
            var angle = $self.data ('angle') || '90'
            var scale = $self.data ('scale') || -1
            var origin = $self.data ('origin') || '50% 50%'
      
            if (down) {
              up = '-' + down
              if (up.substr (0, 2) == '--') up = up.substr (2)
            }
            
            if (right) {
              left = '-' + right
              if (left.substr (0, 2) == '--') left = left.substr (2)
            }
      
            if (effect == 'relax') {
              if (scale == -1) scale = .92 
              if (origin == '50% 50%') origin = 'top'
              fxData = {
                one: 'scaleY(' + scale + ')',
                two: 'scaleY(1)',
                orn: origin,
                crv: 'cubic-bezier(0, 0, 0.001, 1)'
              }
            }
      
            if (effect == 'slide') {
              if (!up) up = '20px'
              fxData = {
                one: 'translate(' + left + ',' + up + ')',
                two: 'translate(0,0)',
                crv: 'cubic-bezier(0, 0.9, 0.1, 1)'
              }
            }
            
            if (effect == 'zoom') {
              if (scale == -1) scale = .5
              fxData = {
                one: 'scale(' + scale + ')',
                two: 'scale(1)',
                orn: origin,
                crv: 'cubic-bezier(0, 0.75, 0.25, 1)'
              }
            }
            
            if (effect == 'screw') {
              if (scale == -1) scale = .5
              if (!angle) angle = 90
              fxData = {
                one: 'scale(' + scale + ') rotate(' + angle + 'deg)',
                two: 'scale(1) rotate(0)',
                orn: origin,
                crv: 'cubic-bezier(0, 0.75, 0.25, 1)'
              }
            }
            
            if (fxData) {
              for (var i=0; i<cssPrefixes.length; ++i) {
                style1 += (
                  cssPrefixes[i] + cssTransform + ': ' + fxData.one + '; ' +
                  cssPrefixes[i] + cssTransformOrigin + ': ' + fxData.orn +  '; '
                )
                style2 += (
                  cssPrefixes[i] + cssTransform + ': ' + fxData.two + '; ' +
                  cssPrefixes[i] + 'transition: ' +
                  'opacity ' + duration + 'ms ease-out, ' + 
                  cssPrefixes[i] + cssTransform + ' ' + duration + 'ms ' + fxData.crv + '; '
                )
              }
            }
            
            $self.data ('style-1', style1)
            $self.data ('style-2', style2)
            
          }
          
      
          // if initial style set, use it
          
          if (!style1) style1 = $self.data ('style-1')
          if (style1) {
            $self.attr ('style', $self.attr ('style') + '; ' + style1)
          }
          
          
          // iterate through inner objects to find images
          
          $self.find ('*').addBack ().each (function () {
            var $element = $ (this);
      
            // img elements
            if ($element.is('img')) if ($element.attr ('src')) {
              if (!cached ($element.attr ('src'))) {
                innerImagesSrcs[$element.attr ('src')] = true
              }
            }
            
            // css properties with images
            for (var i=0; i<cssImageProps.length; ++i) {
              var key = cssImageProps[i]
              var value = $element.css (key)
              var pos = -1
              var match
              if (value && ((pos = value.indexOf ('url(')) >= 0)) {
                while ((match = cssUrlRegex.exec (value)) !== null) {
                  if (!cached (match[2])) {
                    innerImagesSrcs[match[2]] = true
                  }
                }
              }
            }

            // video
            if ($element.is ('video')) {
              var event = $element.data ('emerge-event') || 'canplaythrough'
              innerItems.push ({
                'item': $element,
                'event': event
              })
            }

            // if ($element.is('.emerge-item')) {
            //   log ('emerge item to load: ' + $element[0]) //:dev
            //   var event = $element.data ('event')
            //   if (event == '') event = 'canplaythrough'
            //   if (event = $element.data ('event')) {
            //     log ('emerge item load event: ' + event) //:dev
            //     innerItems.push ({
            //       'item': $element,
            //       'event': event
            //     })
            //     // elementsCount ++
            //     // $element.on (event, element)
            //   } else { //:dev
            //     log ('no event') //:dev
            //   }
            // }
                    
          })
          
          
          // start spinner, if necessary and possible
          
          // if (1 || (Object.keys (innerImagesSrcs).length > 0)) {
            if (spin = $self.data ('spin')) {

                var customSpinnerID = $self.data ('spin-element')

                if (customSpinnerID) {

                  // use custom spinner

                  var $spinElement = $ ('#' + customSpinnerID).clone ().css ({
                    'position': 'absolute',
                    'display': 'block'
                  })


                } else {

                  // use built-in spinner

                  if ($self.data ('spin-size')) spinnerRadius = $self.data ('spin-size') / 2
                  if ($self.data ('spin-color')) spinnerColor = $self.data ('spin-color')
                  if ($self.data ('spin-period')) spinnerPeriod = $self.data ('spin-period')
                  if ($self.data ('spin-direction')) spinnerBackwards = (
                    ($self.data ('spin-direction') == 'clockwise') ? 0:1
                  )

                  spinnerFadeDuration = duration

                  var $spinElement = $ (
                    spinnerCode (spinnerRadius, spinnerColor, spinnerBackwards, spinnerPeriod, spinnerFadeDuration)
                  )

                }

                $spinElement.css ({
                  'width': '100%',//$self.width (),
                  'height': Math.min ($self.height (), document.body.clientHeight - $self.offset ().top)
                })

                $spinElement.addClass ('emerge-spin-element')

                $self.before ($spinElement)
                $self.data ('_spinner', $spinElement)
            
            }
          // }
          
          
          // wait for all inner images
          for (var i in innerImagesSrcs) {
            log ('image to load: ' + i) //:dev
            var imageToWaitFor = new Image ()
            imageToWaitFor.src = i
            elementsCount ++
            if (imageToWaitFor.width > 0) {
              element ()
            } else {
              $ (imageToWaitFor).on ('load error', element)
            }
          }
      
          // wait for other objects (videos for now)
          for (var i in innerItems) {
            log ('item to load: ' + innerItems[i]) //:dev
            elementsCount ++
            var $element = innerItems[i]['item']
            var event = innerItems[i]['event']
            log ('readyState: ' + $element[0].readyState) //:dev
            if ($element[0].readyState >= 4) {
              // this is for video only
              element ()
            } else {
              $element.on (event, element)
            }
          }
          
          // if there were no images or other objects, this will help
          elementsCount ++
          element ()
          
      
          $prev = $self
          
              
        })

      }
      
      if (window.navigator && (window.navigator.loadPurpose === 'preview')) {
        $ ('.emerge').css ('transition', 'none')
        $ ('.emerge').css ('opacity', '1')
        return false
      }
      
      $ ('.emerge-replay').each (function () {

        var $self = $ (this)
        $self.click (function () {

          log ('REPLAY') //:dev
          // clearAllTimeouts ()?
          // actually, it works even without it
          $ ('.emerge').css ('transition', 'none')
          $ ('.emerge').css ('opacity', '0')
          $ ('.emerge-spin-element').remove ()

          play ()
          return false

        })

      })

      play ()

    })
  
  }) (jQuery)
  
  document.write ('<style>.emerge { opacity: 0; }</style>')
  
}