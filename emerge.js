//! v.2.0 http://ilyabirman.net/projects/emerge/
/*jslint browser, devel */                   //:dev
/*global getComputedStyle, queueMicrotask */ //:dev
(function () {
    "use strict";

    const emerge = "emerge";
    const emergeSpin = "emerge-spin-element";

    const waitingForView = new WeakMap();
    const spinner = new WeakMap();

    const defaultDuration = 500;
    const spinner_defaults = Object.freeze({
        spinSize: 24,
        spinColor: "#404040",
        spinDirection: "clockwise",
        spinPeriod: 1333,
        duration: defaultDuration
    });

    const cssImageProps = [
        "backgroundImage",
        "borderImage",
        "borderCornerImage",
        "listStyleImage",
        "cursor"
    ];
    const cssUrlRegex = /url\(\s*(['"]?)(.*?)\1\s*\)/g;

    function ready(callback) {
        if (document.readyState !== "loading") {
            callback();
        } else {
            document.addEventListener(
                "readystatechange",
                function () {
                    if (document.readyState === "interactive") {
                        callback();
                    }
                },
                {passive: true}
            );
        }
    }

    function spinnerCode(diameter, color, direction, period, fadeDuration) {
        const element = document.createElement("div");
        Object.assign(
            element.style,
            {
                position: "absolute",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                transition: `opacity ${fadeDuration}ms ease-out`
            }
        );
        element.innerHTML = (
            "<svg viewBox='0 0 100 100' display='block'>" +
            "<defs><mask id='cut'>" +
            "<rect width='100' height='100' fill='white' stroke='none' />" +
            "<circle r='40' cx='50' cy='50' fill='black' stroke='none' />" +
            "<polygon points='50,50 100,25 150,50 100,75' fill='black'" +
            "stroke='none' transform-origin='center center' />" +
            "</mask></defs>" +
            "<circle r='50' cx='50' cy='50' mask='url(#cut)' stroke='none' />" +
            "</svg>"
        );

        const svg = element.firstElementChild;

        svg.setAttribute("width", diameter);
        svg.setAttribute("hight", diameter);
        svg.lastElementChild.setAttribute("fill", color);

        element.firstElementChild.animate(
            [
                {transform: "rotate(0turn)"},
                {transform: "rotate(1turn)"}
            ],
            {
                duration: Number(period),
                iterations: Infinity,
                direction: (
                    direction === "counter-clockwise"
                    ? "reverse"
                    : "normal"
                )
            }
        );

        return element;
    }

    function withinView(el) {
        const bodyHeight = Math.min(
            document.body.clientHeight,
            document.documentElement.clientHeight
        );
        const position = el.getBoundingClientRect().top;
        const scrollTop = (
            window.pageYOffset ||
            document.documentElement.scrollTop
        );
        return (position - scrollTop) < bodyHeight;
    }

    function getEmergeElements() {
        return Array.from(document.querySelectorAll(`.${emerge}`));
    }

    const imgLoaded = (function () {
        const cache = Object.create(null);
        return function imgLoaded(url) {
            if (cache[url] !== undefined) {
                return cache[url];
            }

            cache[url] = new Promise(function (resolve) {
                const img = document.createElement("img");
                img.src = url;

                if (img.complete) {
                    resolve();
                } else {
                    img.addEventListener("load", () => resolve());
                    img.addEventListener("error", () => resolve());
                }
            });

            return cache[url];
        };
    }());

    function eventDispatched(element, event) {
        return new Promise(function (resolve) {
            if (element.readyState >= 4) {
                // this is for video only
                resolve();
            } else {
                element.addEventListener(event, () => resolve());
            }
        });
    }

    function get_element_to_wait_for(element, previous) {
        return (
            element.dataset.await !== undefined
            ? document.getElementById(element.dataset.await)
            : (
                element.dataset.continue !== undefined
                ? previous
                : undefined
            )
        );
    }

    function is_cyclic(element) {
        let next = element;
        while (next.dataset.await !== undefined) {
            next = document.getElementById(next.dataset.await);
            if (next === null) {
                return false;
            }
            if (next === element) {
                return true;
            }
        }
        return false;
    }

    function fire(element) {
        const spinElement = spinner.get(element);
        if (spinElement) {
            spinElement.style.opacity = 0;
            setTimeout(function () {
                if (element.parentNode.style.position === "relative") {
                    element.parentNode.style.position = null;
                }
                spinElement.remove();
            }, defaultDuration);
        }

        element.style.transition = `opacity ${defaultDuration}ms ease-out`;
        element.style.opacity = 1;

        const style2 = element.dataset["style-2"];
        if (style2) {
            element.setAttribute(
                "style",
                element.getAttribute("style") + "; " + style2
            );
        }

        console.log("  FIRED!", element.id); //:dev
    }

    const viewWatcher = new IntersectionObserver(function (entries, watcher) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting || withinView(entry.target)) {
                if (waitingForView.has(entry.target)) {
                    waitingForView.get(entry.target)();
                }
                waitingForView.delete(entry.target);
                watcher.unobserve(entry.target);
                fire(entry.target);
            }
        });
    });

    function play() {
        const promises = new WeakMap();

        getEmergeElements().forEach(function (self, index, emerging) {
            if (
                self.dataset.await &&
                document.getElementById(self.dataset.await) === null
            ) {
                throw (
                    `Emerge: Element with ID “${self.dataset.await}” not found.`
                );
            }
            const previous = emerging[index - 1];
            const box = self.getBoundingClientRect();

            const duration = self.dataset.duration || defaultDuration;

            let style1 = "";
            let style2 = "";

            const effect = self.dataset.effect || false;

            if (self.dataset.opaque) {
                self.style.opacity = 1;
            }

            if (effect) {
                let fxData = {};
                const cssTransform = "transform";
                const cssTransformOrigin = "transform-origin";
                let up = self.dataset.up || 0;
                const down = self.dataset.down || 0;
                let left = self.dataset.left || 0;
                const right = self.dataset.right || 0;
                let angle = self.dataset.angle || "90";
                let scale = self.dataset.scale || -1;
                let origin = self.dataset.origin || "50% 50%";

                if (down) {
                    up = "-" + down;
                    if (up.substr(0, 2) === "--") {
                        up = up.substr(2);
                    }
                }

                if (right) {
                    left = "-" + right;
                    if (left.substr(0, 2) === "--") {
                        left = left.substr(2);
                    }
                }

                if (effect === "relax") {
                    if (scale === -1) {
                        scale = 0.92;
                    }
                    if (origin === "50% 50%") {
                        origin = "top";
                    }
                    fxData = {
                        one: "scaleY(" + scale + ")",
                        two: "scaleY(1)",
                        orn: origin,
                        crv: "cubic-bezier(0, 0, 0.001, 1)"
                    };
                }

                if (effect === "slide") {
                    if (!up) {
                        up = "20px";
                    }
                    fxData = {
                        one: "translate(" + left + "," + up + ")",
                        two: "translate(0,0)",
                        crv: "cubic-bezier(0, 0.9, 0.1, 1)"
                    };
                }

                if (effect === "zoom") {
                    if (scale === -1) {
                        scale = 0.5;
                    }
                    fxData = {
                        one: "scale(" + scale + ")",
                        two: "scale(1)",
                        orn: origin,
                        crv: "cubic-bezier(0, 0.75, 0.25, 1)"
                    };
                }

                if (effect === "screw") {
                    if (scale === -1) {
                        scale = 0.5;
                    }
                    if (!angle) {
                        angle = 90;
                    }
                    fxData = {
                        one: "scale(" + scale + ") rotate(" + angle + "deg)",
                        two: "scale(1) rotate(0)",
                        orn: origin,
                        crv: "cubic-bezier(0, 0.75, 0.25, 1)"
                    };
                }

                if (fxData) {
                    style1 += (
                        `${cssTransform}: ${fxData.one};` +
                        `${cssTransformOrigin}: ${fxData.orn};`
                    );
                    style2 += (
                        cssTransform + ": " + fxData.two + "; " +
                        "transition: " +
                        "opacity " + duration + "ms ease-out, " +
                        `${cssTransform} ${duration}ms ${fxData.crv};`
                    );
                }

                self.dataset["style-1"] = style1;
                self.dataset["style-2"] = style2;
            }

            // if initial style set, use it

            if (!style1) {
                style1 = self.dataset["style-1"];
            }

            if (style1) {
                self.setAttribute(
                    "style",
                    self.getAttribute("style") + "; " + style1
                );
            }

            const first = [];

            // iterate through inner objects to find images

            first.push(Promise.all([self].concat(
                Array.from(self.querySelectorAll("*"))
            ).reduce(
                function (sources, element) {

                    // img and video elements
                    if (element.nodeName.toLowerCase() === "img") {
                        sources.push(imgLoaded(element.src));
                    } else if (element.nodeName.toLowerCase() === "video") {
                        sources.push(
                            eventDispatched(
                                element,
                                (
                                    element.dataset["emerge-event"] ||
                                    "canplaythrough"
                                )
                            )
                        );
                    }

                    // css properties with images
                    const css = getComputedStyle(element);
                    cssImageProps.forEach(function (key) {
                        const value = css[key];
                        let match;
                        if (value && (value.indexOf("url(") !== -1)) {
                            while (true) {
                                match = cssUrlRegex.exec(value);
                                if (match === null) {
                                    break;
                                }
                                sources.push(imgLoaded(match[2]));
                            }
                        }
                    });

                    return sources;
                },
                []
            )));

            const element_to_wait_for = get_element_to_wait_for(self, previous);
            if (
                element_to_wait_for !== undefined &&
                !is_cyclic(self)
            ) {
                first.push(new Promise(function (resolve) {
                    queueMicrotask(function () {
                        promises.get(element_to_wait_for).then(resolve);
                    });
                }));
            }

            let last;
            const hold = Number(self.dataset.hold);
            if (self.dataset.expose !== undefined && !withinView(self)) {
                last = new Promise(function (resolve) {
                    viewWatcher.observe(self);
                    waitingForView.set(self, resolve);
                });
            } else if (!Number.isNaN(hold)) {
                last = (function () {
                    let callback;
                    const promise = new Promise(function (resolve) {
                        callback = resolve;
                    });
                    return function () {
                        setTimeout(callback, hold);
                        return promise;
                    };
                }());
            } else {
                last = Promise.resolve();
            }

            promises.set(self, Promise.all(first).then(function () {
                return (
                    typeof last === "function"
                    ? last()
                    : last
                );
            }));

            promises.get(self).then(function () {
                fire(self);
            });

            // start spinner, if necessary and possible

            if (self.dataset.spin) {
                let spinElement;

                const customSpinner = document.getElementById(
                    self.dataset.spinElement
                );

                if (customSpinner !== null) {

                    // use custom spinner

                    spinElement = customSpinner.cloneNode(true);
                    spinElement.style.position = "absolute";
                    spinElement.style.display = "block";
                } else {

                    // use built-in spinner
                    const spinnerOptions = Object.keys(spinner_defaults).reduce(
                        function (options, key) {
                            options[key] = (
                                self.dataset[key] === undefined
                                ? spinner_defaults[key]
                                : self.dataset[key]
                            );
                            return options;
                        },
                        {}
                    );

                    spinElement = spinnerCode(...Object.values(spinnerOptions));
                }

                spinElement.style.width = "100%";
                spinElement.style.height = Math.min(
                    box.height,
                    document.body.clientHeight - (
                        self.getBoundingClientRect().top + window.pageYOffset
                    )
                ) + "px";

                spinElement.classList.add(emergeSpin);

                if (getComputedStyle(self.parentNode).position === "static") {
                    self.parentNode.style.position = "relative";
                }
                self.parentNode.insertBefore(spinElement, self);
                spinner.set(self, spinElement);
            }
        });
    }

    function repeat(event) {
        event.preventDefault();

        console.log("REPLAY"); //:dev

        getEmergeElements().forEach(function (element) {
            element.style.transition = null;
            element.style.opacity = null;
        });

        document.querySelectorAll(`.${emergeSpin}`).forEach(function (element) {
            element.remove();
        });

        play();
    }

    // skip unsupported browsers

    if (
        window.IntersectionObserver === undefined ||
        document.documentElement.animate === undefined
    ) {
        return;
    }

    if (window.navigator && (window.navigator.loadPurpose === "preview")) {
        getEmergeElements().forEach(function (element) {
            element.style.transition = "none";
            element.style.opacity = 1;
        });
        return false;
    }

    const style = document.createElement("style");
    style.innerHTML = `.${emerge} { opacity: 0; }`;
    document.head.append(style);

    // play when the document is ready

    ready(function () {
        play();

        document.querySelectorAll(".emerge-replay").forEach(function (element) {
            element.addEventListener("click", repeat);
        });
    });
}());