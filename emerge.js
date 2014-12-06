// 0.9.4

if (jQuery) {
  
  (function ($) {

    $ (function () {
      
      // from waitForImages
      $.expr[':'].uncached = function (obj) {
    
        // Ensure we are dealing with an `img` element with a valid `src` attribute.
        if (!$ (obj).is ('img[src!=""]')) {
          return false
        }
    
        // Firefox's `complete` property will always be `true` even if the image has not been downloaded.
        // Doing it this way works in Firefox.
        var img = new Image ()
        img.src = obj.src
        return !img.complete
      }
      
      var queue = []
      var defaultDuration = 500
      var $prev = false
      var cssImageProps = [
        'backgroundImage',
        'borderImage',
        'borderCornerImage',
        'listStyleImage',
        'cursor'
      ]
      var cssUrlRegex = /url\(\s*(['"]?)(.*?)\1\s*\)/g
    
      if (window.navigator && (window.navigator.loadPurpose === 'preview')) {
        $ ('.emerge').css ('transition', 'none')
        $ ('.emerge').css ('opacity', '1')
        return false
      }
      
      // plays the actual animation
      var fire = function ($el, shouldGo) {
    
        var hold = $el.data ('hold')
        
        if (hold && !$el.data ('_holding')) {
          $el.data ('_holding', true)
          setTimeout (function () {
            fire ($el, true)
          }, hold)
          return false
        }
        
        if ($el.data ('_holding') && !shouldGo) {
          return false
        }
        
        var $spinElement = $el.data ('_spinner')
        if ($spinElement) { $spinElement.hide ()}
        
        $el.css ('transition', 'opacity ' + defaultDuration + 'ms ease-out')
        $el.css ('opacity', '1')
            
        var style2 = $el.data ('style-2')
        if (style2) {
          $el.attr ('style', $el.attr ('style') + '; '  + style2)
        }
    
        $el.data ('_fired', true)
    
        arm ()
        
      }
      
      // checks the queue and emerges the elements that should go
      var arm = function ($which) {
        if ($which) {
          queue.push ($which)
        }

        for (var i in queue) {
          var $el = queue[i]
          
          if ($el.data ('_fired')) {
    
          } else {
            
            var $test_el
            var deadlock = false
            
            if ($test_el = $el.data ('_waitFor')) {
    
              // check for a deadlock
              while (1) {
                if (!$test_el.data ('_fired')) {
                  
                  if ($test_el[0].id == $el[0].id) {
                    deadlock = true
                    break
                  }
                  if ($test_el = $test_el.data ('_waitFor')) {
                    continue
                  }
                }
                break
              }
              
              if ($el.data ('_waitFor').data ('_fired') || deadlock) {
                fire ($el)
              }
              
            } else {
              fire ($el)
            }
          }
          
        }
        
              }
      
      $ ('.emerge').each (function () {
    
        var $self = $ (this)
        var innerImagesSrcs = {}
        var spin = false
        var spinner = false
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
          var angle = $self.data ('angle') || '0'
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
          var element = $ (this);
    
          // img elements
          if (element.is('img:uncached')) if (element.attr ('src')) {
            innerImagesSrcs[element.attr ('src')] = true
          }
          
          // css properties with images
          for (var i=0; i<cssImageProps.length; ++i) {
            var key = cssImageProps[i]
            var value = element.css (key)
            var pos = -1
            var match
            if (value && ((pos = value.indexOf ('url(')) >= 0)) {
              while ((match = cssUrlRegex.exec (value)) !== null) {
                innerImagesSrcs[match[2]] = true
              }
            }
          }
        
          
        })
        
        
        // start spinner, if necessary and possible
        
        if (Object.keys (innerImagesSrcs).length > 0) if (spin = $self.data ('spin')) {

            var $spinElement = $ ('.emerge-spinner').clone ().css ({
              'position': 'absolute',
              'display': 'block',
              'width': $self.width (),
              'height': Math.min ($self.height (), document.body.clientHeight - $self.offset ().top)
            })

            $self.before ($spinElement)
            $self.data ('_spinner', $spinElement)
        
        }
        
        
        // wait for all inner images
        for (var i in innerImagesSrcs) {
          var imageToWaitFor = new Image ()
          imageToWaitFor.src = i
          elementsCount ++
          if (imageToWaitFor.width > 0) {
            element ()
          } else {
            $ (imageToWaitFor).on ('load error', element)
          }
        }
    
        
        // if there were no images, this will help
        elementsCount ++
        element ()
        
    
        $prev = $self
        
            
      })
      
    })
  
  }) (jQuery)
  
  document.write ('<style>.emerge { opacity: 0; }</style>')
  
}