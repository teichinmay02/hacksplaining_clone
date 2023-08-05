/**
 * Highlight syntax.
 */
$(document)
  .ready(function() {
    if (hljs) {
      hljs.configure({classPrefix: 'code-'});
      hljs.highlightAll();
    }
  });

/**
 * Install a dummy function to intercept callbacks from embedded applications -
 * for instance, when a button is clicked, or text is entered in a field.
 */
window.inputEventOnChild = function(e) {
  // Do nothing, expect to be overridden.
};

/**
 * Flags and functions to indicate start and end of animations.
 */
window.animation_count = 0;

function animating() {
  animation_count++;
  $(".current").addClass("waiting").on("click", function() { return false; });
}

function done() {
  if (--animation_count == 0) {
    $(".current").removeClass("waiting").off();
  }
}

var sounds = {
  pop: function() {
    sounds.play('pop')
  },
  whoosh: function() {
    sounds.play('whoosh')
  },
  bleeps: function() {
    sounds.play('bleeps')
  },
  intro: function() {
    sounds.play('intro')
  },
  play: function(fx) {
    if (!screencast || fx == 'none') {
      return
    }
    
    if (sounds.player) {
      sounds.player.pause()
    }
    
    if (fx == 'thinks' || fx == 'mumble' || fx == 'humming' || fx == 'laugh') {
      if (sounds.hasOwnProperty(fx)) {
        sounds[fx] = sounds[fx] + 1
      }
      else {
        sounds[fx] = 0
      }
      
      fx = fx + '-' + (sounds[fx] % 3)
    }
    
    sounds.player = new Audio('/fx/' + fx + '.wav')
    sounds.player.play()
  },
  player: null
}

/**
 * Recalculate which components should be visible based on which instruction
 * we are on.
 */
var footerClass = footerClass || "blank";
var lessonBackground = lessonBackground || "#fff";
var screencast = screencast || false;

function recalculateVisibility(target)
{
  if (target) {
    if ($('.lesson').data('introductions') == 'on') {
      if ($(target).attr('introductory') == 'true') {
        nextStep()
        
        return
      }
      else if (target == "#finish") {
        $("#screencast-last-frame").fadeIn();
        sounds.play('harp')
      }
    }
    
    // Hide the intro, but show the lesson.
    $(".intro").hide();
    $(".lesson").show();
    $(".exercise-title").show();
    $("footer").addClass(footerClass);

    $(".lesson-holder").css("backgroundColor", lessonBackground);

    // Find the focused element.
    var inFocus = $(target);

    // Hide all the other instructions.
    $(".instruction").not(inFocus).removeClass('current').hide();

    // Show the instruction.
    inFocus.addClass('current');

    if ($('.lesson').data('captions') != 'off') {
      $("#finish.current").show();
      $(".current").fadeIn();
    }
  
    var fx = inFocus.attr('fx');
  
    if (fx) {
      sounds.play(fx)
    }
    
    // Look for a 'show' attribute.
    var show = $(inFocus).attr('show');

    // Set all the listed components to visible, animating if applicable.
    $(show).each(function(i, element) {
      var element   = $(element);
      var animation = element.attr('animation');
      
      // If the element is an animated gif, force reload of the image.
      var id = element.attr('id');
      
      if (id && id.indexOf('animation') > -1) {
        var src = element.attr('src');
        element.attr('src', "");
        element.attr('src', src + "?" + new Date().getTime());
      }

      if (element.hasClass("thought-bubble")) {
        alignThoughtBubbleWithCharacter(element, $(show))
      }

      if (!animation) {
        element.show();
      }
      else if (animation === "fade") {
        animating();
        element.fadeIn(done);
      }
      else if (animation === "slide" || animation === "slide-left")
      {
        if (!fx) {
          sounds.whoosh();
        }
        animating();
        element.show("slide", { direction: "left" }, 500, done);
      }
      else if (animation === "slide-right")
      {
        if (!fx) sounds.whoosh();
        animating();
        element.show("slide", { direction: "right" }, 500, done);
      }
      else if (animation === "bubble")
      {
        if (!fx) {
          sounds.play('thinks');
        }
        
        animating();

        element.children().hide();
        element.show();
        element.find(".first")  .delay(250).fadeIn();
        element.find(".second") .delay(500).fadeIn();
        element.find(".third")  .delay(750).fadeIn();
        element.find(".thinks") .delay(1000).fadeIn(done);
      }
      else if (animation === "logs")
      {
        if (!fx) {
          sounds.bleeps();
        }
        element.children().hide();
        element.show();

        element.children().each(function (index, el) {
          $(el).delay(index * 1000).fadeIn(0);
        })
      }
      else {
        element.show();
      }

      element.addClass('showing');
    })

    // Set everything not in this list, and originally specified as hidden, to invisible.
    $(".hide-by-default").not(show).hide().removeClass('showing');

    // Nudge the user to share if this is the last element.
    if (target == "#finish") {
      $(".display-on-last-frame").fadeIn();
    }
    else {
      $(".display-on-last-frame").hide()
    }

    // Look for a 'trigger' attribute.
    var trigger = $(inFocus).attr('trigger');

    // Trigger the function if it exists.
    if (trigger) {
      triggerEvent(trigger)
    }
    
    // Look for a 'triggerOnClick' attribute.
    var triggerOnClick = $(inFocus).attr('triggerOnClick');

    if (triggerOnClick) {
      
      if (screencast) {
        // Trigger immediately.
        triggerEvent(triggerOnClick);
  
        return false;
      }
  
      // Set up a (self-destructing) click handler for the next time the element is clicked.
      var clickTarget = $(inFocus);

      if ($(clickTarget.parent()).is("a")) {
        clickTarget = $(clickTarget.parent());
      }

      clickTarget.click(function() {
        triggerEvent(triggerOnClick);
        clickTarget.unbind();

        return false;
      });
    }
  }
  else {
    // Reset to original state.
    $(".intro").fadeIn();
    $(".hide-by-default").hide();
    $(".lesson").hide();
    $(".exercise-title").hide();
    $("footer").removeClass(footerClass).removeClass("regular").show();
    $(".display-on-last-frame").hide();
    
    sounds.intro()
  }

  recalculateComponentWidths();
}

$("#screencast-last-frame").click(function() {
  sounds.play('outro')
})

/**
 * Allow Bootstrap grid components to specify their class as e.g. 'col-sm-auto',
 * which means "take up as much as space is left over on this row, dividing
 * equally with other such components with the same class."
 */
function recalculateComponentWidths() {
  $.each(['xs', 'sm', 'md', 'lg'], function(i, gridSize) {

    $('.col-' + gridSize + '-auto:first').parent().each(function() {

      var numberOfCols = $(this).children('.col-' + gridSize + '-auto:visible').length;

      if (numberOfCols > 0 && numberOfCols < 13) {
        var minSpan = Math.floor(12 / numberOfCols);
        var remainder = (12 % numberOfCols);

        $(this).children('.col-' + gridSize + '-auto:visible').each(function(i, col) {
          var width = minSpan;

          if (remainder > 0) {
            width += 1;
            remainder--;
          }

          for (var j = 1; j <= 12; j++) {
            $(this).removeClass('col-' + gridSize + '-' + j);
          }

          $(this).addClass('col-' + gridSize + '-' + width);
        });
      }
    });
  });
}

/**
 * Use the JQuery BBQ library to intelligently track history when
 * instructions are clicked on, and so that we can update visibility
 * of components with each state change. To assist with this, we need to
 * record all the instructions on the page.
 */
var instructions = [];

/**
 * What instruction are we on, if any?
 */
function currentInstruction() {
  var hash = window.location.hash;
  if (!hash) return null;

  // Ignore the #_=_ garbage that ends up in the URI fragment after Social
  // Media login.
  if (!/[a-z0-9]+/.test(hash)) return null;

  return $(hash.replace(/\//,''));
}

/**
 * Detect whether we are waiting for the user to interact with an embedded
 * application.
 */
function awaitingInteraction() {
  var instruction = currentInstruction();
  if (!instruction) return false;

  var waiting = instruction.attr('await');
  if (!waiting) return false;

  // A value of 'true' or a dynamic expression indicates we are waiting on something.
  return waiting != 'false';
}

/**
 * Detect whether the interaction we are waiting for occurred.
 */
function interactionOccurred() {
  var instruction = currentInstruction();
  if (!instruction) return true;

  var waiting = instruction.attr('await');
  if (!waiting) return true;

  // If there is a constant value, we just assume the event has occurred.
  if (waiting == 'true' || waiting == 'false')
    return true;

  // Evaluate a dynamic expression to see whether the event occurred. 
  return triggerEvent(waiting)
}

/**
 * Move to the next instruction.
 */
function nextStep() {
  var whereAt = instructions.indexOf(window.location.hash.replace(/\//,''));

  var next = instructions[whereAt + 1];

  track("exercise", $(".lesson").data('id'), whereAt + 1, instructions.length);

  this.window.location.hash = next.replace("#", "#/");
}

/**
 * Check whether an element is in the view pane.
 */
function isScrolledIntoView(e) {
  var $elem = $(e);

  if ($elem.length === 0) {
    return true;
  }

  var $window = $(window);

  var docViewTop = $window.scrollTop();
  var docViewBottom = docViewTop + $window.height();

  var elemTop = $elem.offset().top;
  var elemBottom = elemTop + $elem.height();

  return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
}

/**
 * Fire various actions when the user clicks to the next instruction.
 */
$(document)
  .on("click", 'a[href*="#"],.clickable', function() {

    /**
     * Don't do anything if we are waiting for the user to interact with
     * an embedded application.
     */
    if (awaitingInteraction()) {
      return false;
    }

    // Find the current instruction, it we have set the whole page to clickable.
    var current = this

    if ($(current).is(".clickable")) {
      current = $(".instruction.current").parent()[0];
    }

    /**
     * Update the <title> tag, and write to the browser history.
     */
    if (current.pathname === location.pathname) {
      if (current.hash) {
        // We expect the link to correspond to an instruction element.
        var elementId = current.hash.replace("#/", "#");
        var element = $(elementId);

        if (element) {
          // If the next instruction has a title attribute, update
          // the page title (so we get a readable browser history).
          var title = $(element).attr("title");
          if (title) {
            document.title = $(".lesson").data('name') + ' - ' + title;
          }

          // Track progress.
          var whereAt = instructions.indexOf(elementId);

          track("exercise", $(".lesson").data('id'), whereAt + 1, instructions.length);
        }

        // Update the browser the browser history.
        $.bbq.pushState('#/' + elementId.slice(1));
      }
      else {
        // Reset the page to the original state.
        $.bbq.removeState();
      }
    }

    return false;
  });

/**
 * Update the state of the progress baubles.
 */
function updateProgressBaubles() {
  var whereAt = instructions.indexOf(window.location.hash.replace(/\//,''));

  for (var j = 0; j < instructions.length; j++) {
    var element = $($(".tracking a").get(j));

    if (j <= whereAt) {
      element.addClass("done");
    }
    else {
      element.removeClass("done");
    }
  }
}

/**
 * Follow the 'next' links to enumerate all the instructions on the page.
 */
function enumerateInstructions() {
  var instructions = [];

  function instructionAfter(id) {
    return $(id).closest("a").attr("href");
  }

  var instruction = "#start";

  while (instructions.indexOf(instruction) == -1) {
    instructions.push(instruction);

    instruction = instructionAfter(instruction);

    if (!instruction || instruction.indexOf("#") == -1) {
      break;
    }
  }

  return instructions;
}

/**
 * Initialize on-screen components and register listeners when the page is
 * first load.
 */
$(document)
  .ready(function() {

    /**
     * Respond to changes in the URL hash by updating the visibility of
     * various onscreen components, and updating the progress baubles.
     */
    $(window).unbind("hashchange").bind("hashchange", function(e) {
      updateScreenStateBasedOnHash();
    });

    function updateScreenStateBasedOnHash()
    {
      var target = location.hash.replace(/^#\/?/,'');

      if (document.getElementById(target)) {
        recalculateVisibility("#" + target);

        if (target != "start") {
          target = "#" + target;

          if (!isScrolledIntoView(target)) {
            $.smoothScroll({ scrollTarget: target, offset: -50 });
          }
        }
      }
      else {
        recalculateVisibility();
      }

      updateProgressBaubles();
    }

    // Find all the instructions on the page.
    instructions = enumerateInstructions();

    /**
     * Create a progress bauble for each instruction.
     */
    $(instructions).each(function(i, id) {
      var element = $(id);
      var title   = element.attr("title");
      var link    = id.replace("#", "#/")
      var linkId  = id.replace("#", "bauble-")
      
      $(".tracking").append('<a href="' +link + '" title="' + title + '" class="bauble" id="' + linkId +'"></a>');
    });

    /**
     * Listen for changes happening in the app iframe, which may be a
     * trigger to load the next step.
     */
    var firstLoad = true;

    $('#app #frame').on("load", function() {
      if (firstLoad) {
        firstLoad = false;
        return;
      }

      if (awaitingInteraction() && interactionOccurred()) {
        console.log("Interaction happened, proceeding to next step.")
        nextStep();
      }
    });

    /**
     * Render the screen on first load.
     */
    updateScreenStateBasedOnHash();

    /**
     * Finally, make the whole thing visible.
     */
    $(".main.exercise").css('visibility', 'visible');
  });

/**
 * Call a named function and return a value. This attempts to avoid using the
 * eval() function, which can be blocked in some browser settings.
 */
function triggerEvent(event) {
  if      (event === 'invalidLogin')           return invalidLogin()
  else if (event === 'unexpectedError')        return unexpectedError()
  else if (event === 'authenticationBypassed') return authenticationBypassed()
  else if (event === 'sessionHasBeenHijacked') return sessionHasBeenHijacked()
  else if (event === 'authenticationBypassed') return authenticationBypassed()
  
  else if (event === 'disconnect')                 return disconnect()
  else if (event === 'doTheWorm')                  return doTheWorm()
  else if (event === 'downloadMenu')               return downloadMenu()
  else if (event === 'downloadPasswordFile')       return downloadPasswordFile()
  else if (event === 'explodeyZoom')               return explodeyZoom()
  else if (event === 'findMeTacos')                return findMeTacos()
  else if (event === 'highlightBadness')           return highlightBadness()
  else if (event === 'highlightHeader')            return highlightHeader()
  else if (event === 'highlightURL')               return highlightURL()
  else if (event === 'lookupIP')                   return lookupIP()
  else if (event === 'passwordTheft')              return passwordTheft()
  else if (event === 'putCursorBetweenScriptTags') return putCursorBetweenScriptTags()
  else if (event === 'scrollCommandIntoView')      return scrollCommandIntoView()
  else if (event === 'showHack')                   return showHack()
  else if (event === 'showSkull')                  return showSkull()

  else if (event === 'highlightDocType')                   return highlightDocType()
  else if (event === 'interrogatingThePasswordResetPage')  return interrogatingThePasswordResetPage()
  else if (event === 'interrogatingTheRegistrationPage')   return interrogatingTheRegistrationPage()
  else if (event === 'loginWorkflow')                      return loginWorkflow()
  else if (event === 'malAttacks')                         return malAttacks()
  else if (event === 'malAttacksAgain')                    return malAttacksAgain()
  else if (event === 'maliciousLookup')                    return maliciousLookup()
  else if (event === 'maliciousRedirect')                  return maliciousRedirect()
  else if (event === 'manipulateCookie')                   return manipulateCookie()
  else if (event === 'manipulateForm')                     return manipulateForm()
  else if (event === 'safeLoginPage')                      return safeLoginPage()
  else if (event === 'scrollSome')                         return scrollSome()
  else if (event === 'timingTheLoginProcess')              return timingTheLoginProcess()
  else if (event === 'userEnumerationOnLoginPage')         return userEnumerationOnLoginPage()
  else if (event === 'vicComments')                        return vicComments()
  
  else {
    return eval(event + "()");
  }
};
