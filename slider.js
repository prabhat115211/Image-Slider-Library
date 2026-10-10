
class ImageSlider {
    constructor(target, options) {
        options = options || {};
        this.root = typeof target === "string" ? document.querySelector(target) : target;
        if (!this.root) throw new Error("ImageSlider: container not found");

        this.track = this.root.querySelector(".slider__track");
        this.slides = Array.from(this.track.children);
        this.total = this.slides.length;
        this.duration = options.duration || 500; // keep in sync with the CSS transition

        this.current = 0;   // logical index (0 .. total-1)
        this.position = 1;  // physical index in the track (includes clones)
        this.isMoving = false;
        this.timer = null;

        this._cloneEdges();
        this._buildControls();
        this._bindEvents();
        this._render(false);
    }

    /* ---------- Public API ---------- */
    next() { this._step(1); }
    prev() { this._step(-1); }

    goTo(index) {
        if (this.isMoving || index === this.current) return;
        this.current = index;
        this.position = index + 1;
        this._render(true);
    }

    /* ---------- Setup ---------- */
    _cloneEdges() {
        const first = this.slides[0].cloneNode(true);
        const last = this.slides[this.total - 1].cloneNode(true);
        first.setAttribute("aria-hidden", "true");
        last.setAttribute("aria-hidden", "true");
        this.track.appendChild(first);
        this.track.insertBefore(last, this.slides[0]);
    }

    _buildControls() {
        this.prevBtn = this._button("slider__arrow slider__arrow--prev", "Previous slide", "\u2039");
        this.nextBtn = this._button("slider__arrow slider__arrow--next", "Next slide", "\u203A");

        this.dotsWrap = document.createElement("div");
        this.dotsWrap.className = "slider__dots";
        this.dots = this.slides.map((_, i) => {
            const dot = this._button("slider__dot", "Go to slide " + (i + 1), "");
            dot.dataset.index = i;
            this.dotsWrap.appendChild(dot);
            return dot;
        });

        this.root.appendChild(this.prevBtn);
        this.root.appendChild(this.nextBtn);
        this.root.appendChild(this.dotsWrap);
    }

    _button(className, label, text) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = className;
        btn.setAttribute("aria-label", label);
        btn.textContent = text;
        return btn;
    }

    _bindEvents() {
        this.prevBtn.addEventListener("click", () => this.prev());
        this.nextBtn.addEventListener("click", () => this.next());

        // One delegated listener for all dots
        this.dotsWrap.addEventListener("click", (e) => {
            const dot = e.target.closest(".slider__dot");
            if (dot) this.goTo(Number(dot.dataset.index));
        });

        this.track.addEventListener("transitionend", (e) => {
            if (e.target === this.track) this._settle();
        });

        this.root.setAttribute("tabindex", "0");
        this.root.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight") this.next();
            if (e.key === "ArrowLeft") this.prev();
        });
    }

    /* ---------- Movement ---------- */
    _step(direction) {
        // Ignore clicks while an animation is running
        if (this.isMoving) return;
        // position may land on a clone (0 or total + 1)
        this.position += direction;
        this.current = (this.current + direction + this.total) % this.total;
        this._render(true);
    }

    // Percent-based translate stays correct at every viewport width.
    _render(animate) {
        this.isMoving = animate;
        this.track.classList.toggle("is-instant", !animate);
        this.track.style.transform = "translateX(" + (-this.position * 100) + "%)";
        this._updateDots();
        if (animate) {
            // Fallback in case transitionend never fires
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this._settle(), this.duration + 100);
        }
    }

    // After a slide finishes, hop invisibly from a clone to its real twin.
    _settle() {
        if (!this.isMoving) return;
        clearTimeout(this.timer);
        this.isMoving = false;
        if (this.position === 0) this.position = this.total;
        else if (this.position === this.total + 1) this.position = 1;
        else return;
        this.track.classList.add("is-instant");
        this.track.style.transform = "translateX(" + (-this.position * 100) + "%)";
        // Force a style flush so the jump skips the transition
        void this.track.offsetWidth;
        this.track.classList.remove("is-instant");
    }

    _updateDots() {
        this.dots.forEach((d, i) => {
            const active = i === this.current;
            d.classList.toggle("is-active", active);
            d.setAttribute("aria-current", active ? "true" : "false");
        });
    }
}