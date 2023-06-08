"use strict";
(function () {
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
                { passive: true }
            );
        }
    }
    
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = window.innerHeight;
    
    Object.assign(
        canvas.style,
        {
            pointerEvents: "none",
            position: "fixed",
            top: 0,
            right: 0
        }
    );
    
    const ctx = canvas.getContext("2d");
    
    function draw_viewport(pos, intensity = 1) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
        ctx.strokeRect(0, pos, canvas.width, (canvas.height / document.body.clientHeight) * canvas.height);
    }
    
    function draw_screen(pos, intensity) {
        ctx.fillStyle = `rgba(255, 0, 0, ${intensity})`;
        ctx.fillRect(0, pos, canvas.width, (canvas.height / document.body.clientHeight) * canvas.height);
    }
    
    let data;
    const canvas_lines = new Float32Array((1 << 16) - 1);
    let max = 0;
    let section_size;
    let viewport_size;
    
    let imgs;

    function draw_state() {
        canvas_lines.fill(0);
        const drawable_height = canvas.height - viewport_size;
        
        for (let i = 0; i < drawable_height; i += 1) {
            for (let j = 0; j < section_size; j += 1) {
                canvas_lines[i] += data[(section_size * i) + j]
            }
        }
        
        for (let i = 0; i < drawable_height; i += 1) {
            canvas_lines[i] = canvas_lines[i] / max;
        }

        for (let i = 0; i < drawable_height; i += 1) {
            draw_screen(i, canvas_lines[i]);
        }
    }
    
    function draw_imgs() {
        ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
        const ratio = canvas.height / document.body.clientHeight;
        imgs.forEach(rect => {
            ctx.fillRect(
                rect.x * ratio,
                rect.y * ratio,
                rect.width * ratio,
                rect.height * ratio
            );
        });    
    }
    
    function handle_resize() {
        canvas.height = window.innerHeight;
        section_size = Math.trunc(document.body.clientHeight / canvas.height);
        imgs = Array.from(document.images).map((image) => image.getBoundingClientRect());
    }
    
    window.addEventListener("resize", handle_resize);
    
    let frame_request;
    let prev_pos;
    let prev_time;
    
    function run(time) {
        
        const offset = window.pageYOffset;
        const count = (
            data[offset] === undefined
            ? 1
            : data[offset] + 1
        );
        
        data[offset] = count;
        
        max = Math.max(max, count);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = `rgba(0, 0, 0, 0.05)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        draw_state();

        draw_imgs();
        
        draw_viewport((offset / document.body.clientHeight) * canvas.height);
        
        frame_request = requestAnimationFrame(run);
        
        prev_pos = offset;
        prev_time = time;
        prev_velocity = (offset - prev_pos) / (time - prev_time);
    }
    
    if (
        window.km_vp_tracker !== undefined &&
        typeof window.km_vp_tracker.cancel === "function"
    ) {
        window.km_vp_tracker.cancel();
    }
    
    ready(function () {
        document.body.append(canvas);
        data = new Uint32Array(document.body.clientHeight)
        section_size = Math.trunc(document.body.clientHeight / canvas.height);
        viewport_size = ((canvas.height / document.body.clientHeight) * canvas.height);
        frame_request = requestAnimationFrame(run);
        imgs = Array.from(document.images).map((image) => image.getBoundingClientRect());
    });
    
    window.km_vp_tracker = Object.freeze({
        cancel: function cancel() {
            cancelAnimationFrame(frame_request);
            canvas.remove();
            window.removeEventListener("resize", handle_resize);
        }
    });
}());
