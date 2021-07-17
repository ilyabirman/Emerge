//! v.1.4.0, http://ilyabirman.net/projects/emerge/
;(function () {
  "use strict"

  let queue
  let elementsFired
  let elementsOnHold

  const waitingForView = new WeakMap ()
  const waitFor = new WeakMap ()
  const spinner = new WeakMap ()

  const defaultDuration = 500
  const cssImageProps = [
    'backgroundImage',
    'borderImage',
    'borderCornerImage',
    'listStyleImage',
    'cursor'
  ]
  const cssUrlRegex = /url\(\s*(['"]?)(.*?)\1\s*\)/g

  const spinnerKeyframe = [
    {transform: 'rotate(0deg)'},
    {transform: 'rotate(360deg)'}
  ]

  function ready (callback) {
    if (document.readyState !== 'loading') {
      callback ()
    } else {
      document.addEventListener (
        'readystatechange',
        function () {
          if (document.readyState === 'interactive') {
            callback ()
          }
        },
        {passive: true}
      )
    }
  }

  function cached(src) {
    const img = new Image ()
    img.src = src
    log ((img.complete? 'cached' : 'uncached') + ': ' + img.src) //:dev
    return img.complete
  }

  function spinnerCode(radius, color, backwards, period, fadeDuration) {
    const diameter = radius * 2
    const spinner = document.createElement ('div')
    Object.assign (
      spinner.style,
      {
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: `opacity ${fadeDuration}ms ease-out`
      }
    )
    spinner.innerHTML = `
      <svg width="${diameter}" height="${diameter}" viewBox="0 0 100 100" display="block">
        <defs>
          <mask id="cut">
            <rect width="100" height="100" fill="white" stroke="none" />
            <circle r="40" cx="50" cy="50" fill="black" stroke="none" />
            <polygon points="50,50 100,25 150,50 100,75" fill="black" stroke="none" transform-origin="center center" />
          </mask>
        </defs>
        <circle r="50" cx="50" cy="50" mask="url(#cut)" fill="${color}" stroke="none" />
      </svg>
    `

    spinner.querySelector ('polygon').animate (
      spinnerKeyframe,
      {
        duration: period,
        iterations: Infinity,
        direction: backwards ? 'reverse' : 'normal'
      }
    )

    return spinner
  }

  function log(txt) {         //:dev
    if (1) console.log (txt)  //:dev
  }                           //:dev

  function withinView(el) {
    const bodyHeight = Math.min (
      document.body.clientHeight,
      document.documentElement.clientHeight
    )
    const position = el.getBoundingClientRect ().top
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    return (position - scrollTop) < bodyHeight
  }

  // calling fire means:
  // element el is has all content loaded and can be shown,
  // also there is no other element that prevents it from being shown,
  // so check if it has its own limitations like hold timeout or scrolling
  function fire(el, shouldGo) {

    const hold = el.dataset.hold
    const expose = el.dataset.expose

    if (expose && !withinView (el)) {
      waitingForView.set (el, true)
      log ('on expose: ' + el.id + ' (' + expose + ')') //:dev
      return false
    }

    if (expose) {
      log ('in view: ' + el.id)  //:dev
    }

    if (hold && !elementsOnHold.includes (el)) {
      elementsOnHold.push (el)
      log ('   hold: ' + el.id + ' (' + hold + ' ms)') //:dev
      setTimeout (function () {
        log ('TIME') //:dev
        fire (el, true)
      }, hold)
      return false
    }
    if (elementsOnHold.includes (el) && !shouldGo) {
      log ('on hold: ' + el.id) //:dev
      return false
    }

    const spinElement = spinner.get (el)
    if (spinElement) {
      spinElement.style.opacity = 0
      setTimeout (function () {
        if (el.parentNode.style.position === 'relative') {
          el.parentNode.style.position = null
        }
        spinElement.remove ()
      }, defaultDuration)
    }

    el.style.transition = `opacity ${defaultDuration}ms ease-out`
    el.style.opacity = 1

    const style2 = el.dataset['style-2']
    if (style2) {
      el.setAttribute ('style', el.getAttribute ('style') + '; '  + style2)
    }

    log ('  FIRED! ' + el.id) //:dev
    elementsFired.push (el)

    arm ()

  }

  // calling arm means:
  // element $which has all content loaded and can be shown,
  // but maybe there are other elements which it waits for
  function arm(which) {
    if (which) {
      log ('ARM:     ' + which.id) //:dev
      queue.push (which)
    } else { //:dev
      log ('ARM') //:dev
    }

    queue.forEach (function (el) {

      if (elementsFired.includes (el)) {

        log ('  fired earlier: ' + el.id)  //:dev
        // log (elementsFired)  //:dev

      } else {

        let test_el
        let deadlock = false

        if (test_el = waitFor.get (el)) {
          if (!elementsOnHold.includes (el)) {     //:dev
            log ('  waits: ' + el.id)              //:dev
          }                                        //:dev

          // check for a deadlock
          while (true) {
            if (!elementsFired.includes (test_el)) {

              log ('     for ' + test_el.id) //:dev

              if (test_el == el) {
                log ('  D’OH, WE HAVE A DEADLOCK!') //:dev
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
            (elementsFired.includes (waitFor.get (el)))
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

  const viewWatcher = new IntersectionObserver (function (entries, watcher) {
    entries.forEach (function (entry) {
      if (entry.isIntersecting || withinView (entry.target)) {
        waitingForView.delete (entry.target)
        watcher.unobserve (entry.target)
        fire (entry.target)
      }
    })
  })

  function play() {

    queue = []
    elementsFired = []
    elementsOnHold = []

    const prevs = new WeakMap ()
    let prev

    document.querySelectorAll ('.emerge').forEach (function (self) {

      const innerImagesSrcs = {} // should be an object to keep sources unique
      const innerItems = []
      const box = self.getBoundingClientRect ()

      const duration = self.dataset.duration || defaultDuration

      let spinnerRadius = 12
      let spinnerPeriod = 1333
      let spinnerColor = '#404040'
      let spinnerBackwards = 0
      const spinnerFadeDuration = duration

      let elementsCount = 0
      let elementsLoaded = 0

      let style1 = ''
      let style2 = ''

      const effect = self.dataset.effect || false
      const expose = self.dataset.expose

      prevs.set (self, prev)

      function enqueue() {

        if (self.dataset.continue) {
          waitFor.set (self, prevs.get (self))
        }

        if (self.dataset.await) {
          waitFor.set (self, document.getElementById (self.dataset.await))
        }

        if (waitFor.has (self)) { //:dev
          log ('         ' + self.id + ' will wait for ' + waitFor.get (self).id) //:dev
        } //:dev

        arm (self)

      }

      function element () {

        elementsLoaded += 1

        if (elementsLoaded === elementsCount) {
          setTimeout (enqueue, self.dataset.slow)
        }

      }

      if (self.dataset.opaque) {
        self.style.opacity = 1
      }

      if (expose) { //:dev
        viewWatcher.observe (self)
      } //:dev

      if (effect) {

        let fxData = {}
        const cssPrefixes = ['', '-webkit-']
        const cssTransform = 'transform'
        const cssTransformOrigin = 'transform-origin'
        let up = self.dataset.up || 0
        const down = self.dataset.down || 0
        let left = self.dataset.left || 0
        const right = self.dataset.right || 0
        let angle = self.dataset.angle || '90'
        let scale = self.dataset.scale || -1
        let origin = self.dataset.origin || '50% 50%'

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

          cssPrefixes.forEach (function (prefix) {
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
        self.setAttribute ('style', self.getAttribute ('style') + '; ' + style1)
      }


      // iterate through inner objects to find images

      ;[self].concat (Array.from (self.querySelectorAll ('*'))).forEach (function (element) {

        // img elements
        if (element.nodeName.toLowerCase () === 'img') {
          const url = element.getAttribute ('src')
          if (url && !cached (url)) {
            innerImagesSrcs[url] = true
          }
        }

        // css properties with images
        const css = getComputedStyle (element)
        cssImageProps.forEach (function (key) {
          const value = css[key]
          let match
          if (value && (value.indexOf ('url(') !== -1)) {
            while ((match = cssUrlRegex.exec (value)) !== null) {
              if (!cached (match[2])) {
                innerImagesSrcs[match[2]] = true
              }
            }
          }
        })

        // video
        if (element.nodeName.toLowerCase () === 'video') {
          const event = element.dataset['emerge-event'] || 'canplaythrough'
          innerItems.push ({
            item: element,
            event: event
          })
        }

      })


      // start spinner, if necessary and possible

      if (self.dataset.spin) {
        let spinElement

        const customSpinner = document.getElementById (self.dataset.spinElement)

        if (customSpinner) {

          // use custom spinner

          spinElement = customSpinner.cloneNode (true)
          spinElement.style.position = 'absolute'
          spinElement.style.display = 'block'

        } else {

          // use built-in spinner

          if (self.dataset.spinSize) {
            spinnerRadius = self.dataset.spinSize / 2
          }
          if (self.dataset.spinColor) {
            spinnerColor = self.dataset.spinColor
          }
          if (self.dataset.spinPeriod) {
            spinnerPeriod = self.dataset.spinPeriod
          }
          if (self.dataset.spinDirection) {
            spinnerBackwards = (
              self.dataset.spinDirection === 'clockwise'
              ? 0
              : 1
            )
          }

          spinElement = spinnerCode (spinnerRadius, spinnerColor, spinnerBackwards, spinnerPeriod, spinnerFadeDuration)

        }

        spinElement.style.width = '100%'
        spinElement.style.height = Math.min (
          box.height, // jQuery calculates height regardless of scale, but not offset
          document.body.clientHeight - (self.getBoundingClientRect ().top + window.pageYOffset)
        ) + 'px'

        spinElement.classList.add ('emerge-spin-element')

        if (getComputedStyle(self.parentNode).position === 'static') {
          self.parentNode.style.position = 'relative';
        }
        self.parentNode.insertBefore (spinElement, self)
        spinner.set (self, spinElement)

      }

      // wait for all inner images
      Object.keys (innerImagesSrcs).forEach (function (src) {
        log ('image to load: ' + src) //:dev
        const imageToWaitFor = new Image ()
        imageToWaitFor.src = src
        elementsCount += 1
        if (imageToWaitFor.width > 0) {
          element ()
        } else {
          imageToWaitFor.addEventListener ('load', element)
          imageToWaitFor.addEventListener ('error', element)
        }
      })

      // wait for other objects (videos for now)
      innerItems.forEach (function (inner) {
        log ('item to load: ' + inner)
        elementsCount += 1
        log ('readyState: ' + inner.item.readyState)
        if (inner.item.readyState >= 4) {
          // this is for video only
          element ()
        } else {
          inner.item.addEventListener (inner.event, element)
        }
      })

      // if there were no images or other objects, this will help
      elementsCount += 1
      element ()

      prev = self
    })

  }

  // skip unsupported browsers

  if (
    window.IntersectionObserver === undefined ||
    document.documentElement.animate === undefined
  ) {
    return
  }

  if (window.navigator && (window.navigator.loadPurpose === 'preview')) {
    document.querySelectorAll ('.emerge').forEach (function (element) {
      element.style.transition = 'none'
      element.style.opacity = 1
    })
    return false
  }

  const style = document.createElement ('style')
  style.innerHTML = '.emerge { opacity: 0; }'
  document.head.append (style)

  // play when the document is ready

  ready (function () {

    play ()

    document.querySelectorAll ('.emerge-replay').forEach (function (element) {

      element.addEventListener ('click', function (event) {

        event.preventDefault ()

        log ('REPLAY') //:dev
        // clearAllTimeouts ()?
        // actually, it works even without it
        document.querySelectorAll ('.emerge').forEach (function (element) {
          element.style.transition = null
          element.style.opacity = null
        })
        document.querySelectorAll ('.emerge-spin-element').forEach (function (element) {
          element.remove ()
        })

        play ()

      })

    })

  })

} ());
