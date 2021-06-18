//! v.1.3.2, http://ilyabirman.net/projects/emerge/
;(function () {
  var ready = function (callback) {
    if (document.readyState !== 'loading') {
      callback();
    } else {
      document.addEventListener(
        'readystatechange',
        function () {
          if (document.readyState === 'interactive') {
            callback();
          }
        },
        {passive: true}
      );
    }
  }

  ready (function () {

    var queue;
    var elementsFired;
    var elementsOnHold;
    var watchingScrolling;

    var waitingForView = new WeakMap ()
    var waitFor = new WeakMap ()
    var spinner = new WeakMap ()

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
        ' }' +
        '</style>' +
        '<div style="position: absolute; transition: opacity ' + fadeDuration + 'ms ease-out">' +
        '<div style="position: absolute; left: 50%; top: 50%; margin: -' + radius + 'px">'+
        '<svg width="' + (radius*2) + '" height="' + (radius*2) + '"' +
        'viewBox="0 0 100 100">' +
        '<defs><mask id="cut"><rect width="100" height="100" fill="white" stroke="none" />' +
        '<circle r="40" cx="50" cy="50" fill="black" stroke="none" />' +
        '<polygon points="50,50 100,25 150,50 100,75" fill="black" stroke="none" style="' +
        'transform-origin: center center; ' +
        'animation: ' + animationName + ' ' + period + 'ms linear infinite' +
        '" /></mask></defs>'+
        '<circle r="50" cx="50" cy="50" mask="url(#cut)" fill="' + color + '" stroke="none" />'+
        '</svg>' +
        '</div>' +
        '</div>'
      )
    }

    var log = function (txt) {  //:dev
      if (1) console.log (txt)  //:dev
    }                           //:dev

    var withinView = function (el) {
      // log ('________ noview: ' + $el[0].id) //:dev
      // log ('________ window height = ' + document.body.clientHeight) //:dev
      // log ('________ window height = ' + document.documentElement.clientHeight) //:dev
      // log ('________ element top = ' + ($el.offset ().top - document.body.scrollTop)) //:dev
      var bodyHeight = Math.min (
        document.body.clientHeight, document.documentElement.clientHeight
      )
      var position = el.getBoundingClientRect().top;
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      return (position - scrollTop) < bodyHeight
    }

    // calling fire means:
    // element $el is has all content loaded and can be shown,
    // also there is no other element that prevents it from being shown,
    // so check if it has its own limitations like hold timeout or scrolling
    var fire = function (el, shouldGo) {

      var hold = el.dataset.hold
      var expose = el.dataset.expose

      if (expose && !withinView (el)) {
        waitingForView.set (el, true)
        log ('on expose: ' + el.id + ' (' + expose + ')') //:dev
        return false
      }

      if (expose) {
        log ('in view: ' + el.id)  //:dev
      }

      if (hold && !elementsOnHold.includes(el)) {
        elementsOnHold.push (el)
        log ('   hold: ' + el.id + ' (' + hold + ' ms)') //:dev
        setTimeout (function () {
          log ('TIME') //:dev
          fire (el, true)
        }, hold)
        return false
      }
      if (elementsOnHold.includes(el) && !shouldGo) {
        log ('on hold: ' + el.id) //:dev
        return false
      }

      var spinElement = spinner.get (el)
      if (spinElement) {
        spinElement.style.opacity = 0
        setTimeout (function () {
          spinElement.remove ()
        }, defaultDuration)
      }

      el.style.transition = `opacity ${defaultDuration}ms ease-out`
      el.style.opacity = 1

      var style2 = el.dataset['style-2']
      if (style2) {
        el.setAttribute('style', el.getAttribute('style') + '; '  + style2)
      }

      log ('  FIRED! ' + el.id) //:dev
      elementsFired.push (el)

      arm ()

    }

    // calling arm means:
    // element $which has all content loaded and can be shown,
    // but maybe there are other elements which it waits for
    var arm = function (which) {
      if (which) {
        log ('ARM:     ' + which.id) //:dev
        queue.push (which)
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

      // for (var i in queue) {
      queue.forEach(function (el) {

        if (elementsFired.includes(el)) {

          log ('  fired earlier: ' + el.id)  //:dev
          // log (elementsFired)  //:dev

        } else {

          var test_el
          var deadlock = false

          if (test_el = waitFor.get (el)) {
            if (!elementsOnHold.includes(el)) {      //:dev
              log ('  waits: ' + el.id)                    //:dev
            }                                                  //:dev

            // check for a deadlock
            while (true) {
              if (!elementsFired.includes(test_el)) {

                log ('     for ' + test_el.id) //:dev

                if (test_el == el) {
                  log ('  FUCK, WE HAVE A DEADLOCK!') //:dev
                  deadlock = true
                  break
                }
                if (test_el = waitFor.get (test_el)) {
                  continue
                }
              }
              break
            }

            if (
              (elementsFired.includes(waitFor.get (el)))
              || deadlock
            ) {
              fire (el)
            }

          } else {
            fire (el)
          }
        }

      })

      log ('IDLE') //:dev

    }

    // does stuff when scrolled
    var scrolled = function () {
      queue.forEach (function (el) {
        if (waitingForView.has (el) && withinView (el)) {
          log ('SCROLLED') //:dev
          waitingForView.delete (el)
          fire (el)
        }
      })
    }

    // starts watching scrolling
    var watchScrolling = function () {
      if (!watchingScrolling) {
        $ (window).on ('scroll resize', scrolled) //$
        watchingScrolling = true
        log ('now watching scrolling') //:dev
      }
    }

    var play = function () {

      queue = []
      elementsFired = []
      elementsOnHold = []
      watchingScrolling = false

      var prevs = new WeakMap ()
      var prev;

      document.querySelectorAll ('.emerge').forEach(function (self) {

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

        prevs.set (self, prev)

        var enqueue = function () {

          if (self.dataset.continue) {
            waitFor.set (self, prevs.get(self))
          }

          if (self.dataset.await) {
            waitFor.set (self, document.getElementById (self.dataset.await))
          }

          if (waitFor.has (self)) { //:dev
            log ('         ' + self.id + ' will wait for ' + waitFor.get (self).id) //:dev
          } //:dev

          arm (self)

        }

        var element = function () {

          elementsLoaded ++

          if (elementsLoaded == elementsCount) {
            setTimeout (enqueue, self.dataset.slow)
          }

        }

        if (self.dataset.opaque) {
          self.style.opacity = 1
        }

        // if an effect is set, use it

        effect = self.dataset.effect || false
        duration = self.dataset.duration || defaultDuration

        var expose = self.dataset.expose

        if (expose) { //:dev
          // log ('expose element: ' + self.id) //:dev
          watchScrolling ()
        } //:dev

        if (effect) {

          var fxData = {}
          // var cssTransform = '-webkit-transform'
          // var cssTransformOrigin = '-webkit-transform-origin'
          var cssPrefixes = ['', '-webkit-']
          var cssTransform = 'transform'
          var cssTransformOrigin = 'transform-origin'
          var up = self.dataset.up || 0
          var down = self.dataset.down || 0
          var left = self.dataset.left || 0
          var right = self.dataset.right || 0
          var angle = self.dataset.angle || '90'
          var scale = self.dataset.scale || -1
          var origin = self.dataset.origin || '50% 50%'

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

            cssPrefixes.forEach(function (prefix) {
              style1 += (
                prefix + cssTransform + ': ' + fxData.one + '; ' +
                prefix + cssTransformOrigin + ': ' + fxData.orn +  '; '
              )
              style2 += (
                prefix + cssTransform + ': ' + fxData.two + '; ' +
                prefix + 'transition: ' +
                'opacity ' + duration + 'ms ease-out, ' +
                prefix + cssTransform + ' ' + duration + 'ms ' + fxData.crv + '; '
              )
            })
          }

          self.dataset['style-1'] = style1
          self.dataset['style-2'] = style2

        }

        // if initial style set, use it

        if (!style1) style1 = self.dataset['style-1']
        if (style1) {
          self.setAttribute('style', self.getAttribute('style') + '; ' + style1)
        }


        // iterate through inner objects to find images

        $(self).find ('*').addBack ().each (function () { //$
          var $element = $ (this); //$
          var $spinElement; //$

          // img elements
          if ($element.is('img')) if ($element.attr ('src')) { //$
            if (!cached ($element.attr ('src'))) { //$
              innerImagesSrcs[$element.attr ('src')] = true //$
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
          if ($element.is ('video')) { //$
            var event = $element.get(0).dataset['emerge-event'] || 'canplaythrough' //$
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
        if (spin = self.dataset.spin) {

          var customSpinner = document.getElementById (self.dataset.spinElement)

          if (customSpinner) {

            // use custom spinner

            $spinElement = $ (customSpinner.cloneNode (true))
            $spinElement.get(0).style.position = 'absolute'
            $spinElement.get(0).style.display = 'block'

          } else {

            // use built-in spinner

            if (self.dataset['spin-size']) {
              spinnerRadius = self.dataset['spin-size'] / 2
            }
            if (self.dataset['spin-color']) {
              spinnerColor = self.dataset['spin-color']
            }
            if (self.dataset['spin-period']) {
              spinnerPeriod = self.dataset['spin-period']
            }
            if (self.dataset['spin-direction']) {
              spinnerBackwards = (
                self.dataset['spin-direction'] === 'clockwise'
                ? 0
                : 1
              )
            }

            spinnerFadeDuration = duration

            $spinElement = $ ( //$
              spinnerCode (spinnerRadius, spinnerColor, spinnerBackwards, spinnerPeriod, spinnerFadeDuration)
            )

          }

          $spinElement.css ({ //$
            'width': '100%',//$(self).width (),
            'height': Math.min ($(self).height (), document.body.clientHeight - $(self).offset ().top) //$
          })

          $spinElement.get(0).classList.add ('emerge-spin-element')

          $(self).before ($spinElement) //$
          spinner.set (self, $spinElement.get(0))

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
            $ (imageToWaitFor).on ('load error', element) //$
          }
        }

        // wait for other objects (videos for now)
        for (var i in innerItems) {
          log ('item to load: ' + innerItems[i]) //:dev
          elementsCount ++
          var $element = innerItems[i]['item'] //$
          var event = innerItems[i]['event']
          log ('readyState: ' + $element[0].readyState) //:dev
          if ($element[0].readyState >= 4) { //$
            // this is for video only
            element ()
          } else {
            $element.on (event, element) //$
          }
        }

        // if there were no images or other objects, this will help
        elementsCount ++
        element ()


        prev = self
      })

    }

    if (window.navigator && (window.navigator.loadPurpose === 'preview')) {
      document.querySelectorAll ('.emerge').forEach (function (element) {
        element.style.transition = 'none'
        element.style.opacity = 1
      })
      return false
    }

    document.querySelectorAll ('.emerge-replay').forEach (function (element) {

      element.addEventListener ('click', function () {

        log ('REPLAY') //:dev
        // clearAllTimeouts ()?
        // actually, it works even without it
        document.querySelectorAll ('.emerge').forEach (function (element) {
          element.style.transition = 'none'
          element.style.opacity = 0
        })
        document.querySelectorAll ('.emerge').forEach (function (element) {
          element.remove ()
        });

        play ()
        return false

      })

    })

    play ()
  })

  const style = document.createElement('style')
  style.innerHTML = '.emerge { opacity: 0; }'
  document.head.append(style)
}());
