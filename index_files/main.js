document.addEventListener('DOMContentLoaded', function () {
	const navToggle = document.querySelector('.nav-toggle');
	const navigation = document.querySelector('.site-nav');
	const modal = document.querySelector('[data-form-modal]');

	const siteHeader = document.querySelector('[data-site-header]');
	const homeHero = document.querySelector('[data-page-hero]');

	if (siteHeader) {
		const setHeaderHeightVar = function () {
			// offsetHeight, not getBoundingClientRect().bottom: the rect is
			// relative to the current viewport, so if the page reloads at a
			// scrolled position (Chrome restores scroll on reload) and this
			// runs before the header has picked up its "is-sticky" fixed
			// position, the header is still in normal flow — scrolled off
			// above the viewport — and its rect.bottom comes back deeply
			// negative. --header-height (used as a *subtraction* in the
			// hero's min-height) then flips from "shrink the hero a bit"
			// to "grow it by the entire scroll distance", which is exactly
			// the runaway hero height this caused. offsetHeight is the
			// header's own intrinsic box height — never affected by scroll
			// position or position:fixed. The admin bar isn't part of that
			// box (WP pushes the page down via a margin on <html>, not the
			// header), so it's added explicitly.
			const adminBar = document.getElementById('wpadminbar');
			const totalHeight = siteHeader.offsetHeight + (adminBar ? adminBar.offsetHeight : 0);
			document.documentElement.style.setProperty('--header-height', totalHeight + 'px');
		};
		setHeaderHeightVar();
		window.addEventListener('resize', setHeaderHeightVar);
	}

	// Blur-up placeholder (.mpto-lqip, assets/css/hero.css) — ported from
	// onyca-digital's own main.js (initLqip): fades the placeholder out
	// once the real photo/video next to it has actually finished loading.
	// complete can be true for a broken image too (naturalWidth 0 then),
	// so both are checked — otherwise the placeholder would vanish before
	// the real photo does, on a failed load.
	document.querySelectorAll('.mpto-lqip').forEach(function (placeholder) {
		const parent = placeholder.parentElement;
		if (!parent) {
			return;
		}
		const hide = function () {
			placeholder.classList.add('is-loaded');
		};
		const video = parent.querySelector('video');
		if (video) {
			if (video.readyState >= 2) {
				hide();
				return;
			}
			video.addEventListener('loadeddata', hide, { once: true });
			video.addEventListener('error', hide, { once: true });
			return;
		}
		const real = parent.querySelector('img:not(.mpto-lqip)');
		if (!real) {
			return;
		}
		if (real.complete && real.naturalWidth > 0) {
			hide();
			return;
		}
		real.addEventListener('load', hide, { once: true });
		real.addEventListener('error', hide, { once: true });
	});

	if (siteHeader && homeHero) {
		const desktopHeader = window.matchMedia('(min-width: 1100px)');
		let previousScrollY = window.scrollY;
		let wasPastHero = null;
		let hideTimer;

		function setHeaderImmediately(callback) {
			siteHeader.classList.add('is-instant');
			// Force the browser to commit "transition: none" before the
			// class/transform change below, otherwise it can still animate
			// the change on this same frame (seen as the header flashing
			// visible for a moment right at the hero boundary).
			void siteHeader.offsetHeight;
			callback();
			void siteHeader.offsetHeight;
			window.requestAnimationFrame(function () {
				window.requestAnimationFrame(function () {
					siteHeader.classList.remove('is-instant');
				});
			});
		}

		function updateHeaderOnScroll() {
			const currentScrollY = Math.max(0, window.scrollY);
			if (!desktopHeader.matches) {
				window.clearTimeout(hideTimer);
				siteHeader.classList.remove('is-sticky', 'is-hidden', 'is-instant');
				wasPastHero = null;
				previousScrollY = currentScrollY;
				return;
			}

			const heroBottom = homeHero.getBoundingClientRect().bottom + currentScrollY;
			const pastHero = currentScrollY >= heroBottom;

			if (!pastHero) {
				window.clearTimeout(hideTimer);
				if (wasPastHero) {
					siteHeader.classList.add('is-hidden');
					hideTimer = window.setTimeout(function () {
						setHeaderImmediately(function () {
							siteHeader.classList.remove('is-sticky', 'is-hidden');
						});
					}, 400);
				} else {
					siteHeader.classList.remove('is-sticky', 'is-hidden');
				}
			} else {
				window.clearTimeout(hideTimer);
				if (!wasPastHero) {
					setHeaderImmediately(function () {
						siteHeader.classList.add('is-sticky', 'is-hidden');
					});
				} else if (currentScrollY <= 0 || currentScrollY < previousScrollY) {
					siteHeader.classList.add('is-sticky');
					siteHeader.classList.remove('is-hidden');
				} else if (currentScrollY > previousScrollY) {
					siteHeader.classList.add('is-sticky', 'is-hidden');
				}
			}

			wasPastHero = pastHero;
			previousScrollY = currentScrollY;
		}

		updateHeaderOnScroll();
		window.addEventListener('scroll', updateHeaderOnScroll, { passive: true });
		window.addEventListener('resize', updateHeaderOnScroll);
		desktopHeader.addEventListener('change', updateHeaderOnScroll);
	}

	document.querySelectorAll('input[type="tel"]').forEach(function (input) {
		function getDigits(value) {
			const allDigits = value.replace(/\D/g, '');
			const hasCountryPrefix = allDigits.charAt(0) === '7' || allDigits.charAt(0) === '8';
			return {
				digits: (hasCountryPrefix ? allDigits.substring(1) : allDigits).substring(0, 10),
				hasCountryPrefix: hasCountryPrefix
			};
		}

		function formatPhone(digits) {
			let value = '+7';
			if (!digits.length) return value;
			value += ' (' + digits.substring(0, 3);
			if (digits.length >= 3) value += ')';
			if (digits.length > 3) value += ' ' + digits.substring(3, 6);
			if (digits.length > 6) value += '-' + digits.substring(6, 8);
			if (digits.length > 8) value += '-' + digits.substring(8, 10);
			return value;
		}

		input.maxLength = 18;
		input.inputMode = 'tel';
		input.addEventListener('focus', function () {
			if (!input.value) {
				input.value = '+7 ';
				input.setSelectionRange(input.value.length, input.value.length);
			}
		});
		input.addEventListener('input', function () {
			const caret = input.selectionStart || 0;
			const digitsBeforeCaret = input.value.substring(0, caret).replace(/\D/g, '').length;
			const result = getDigits(input.value);
			const visibleDigitCount = Math.min(digitsBeforeCaret - (result.hasCountryPrefix ? 1 : 0), result.digits.length);
			input.value = result.digits.length ? formatPhone(result.digits) : '';

			let position = result.digits.length ? 2 : 0;
			let counted = 0;
			while (position < input.value.length && counted < visibleDigitCount) {
				if (/\d/.test(input.value.charAt(position))) counted++;
				position++;
			}
			input.setSelectionRange(position, position);
		});
		input.addEventListener('blur', function () {
			if (!getDigits(input.value).digits.length) input.value = '';
		});
	});

	document.querySelectorAll('input[type="email"]').forEach(function (input) {
		input.addEventListener('input', function () {
			input.value = input.value.replace(/\s/g, '');
		});
	});

	if (navToggle && navigation) {
		navToggle.addEventListener('click', function () {
			const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
			navToggle.setAttribute('aria-expanded', String(!isOpen));
			navigation.classList.toggle('is-open', !isOpen);
			document.body.classList.toggle('nav-open', !isOpen);
		});
	}

	function closeModal() {
		if (!modal) {
			return;
		}
		modal.hidden = true;
		modal.setAttribute('aria-hidden', 'true');
		document.body.classList.remove('modal-open');
	}

	document.querySelectorAll('[data-open-form]').forEach(function (button) {
		button.addEventListener('click', function () {
			if (!modal) {
				return;
			}
			modal.hidden = false;
			modal.setAttribute('aria-hidden', 'false');
			document.body.classList.add('modal-open');
			const firstInput = modal.querySelector('input[name="name"]');
			if (firstInput) {
				firstInput.focus();
			}
		});
	});

	document.querySelectorAll('[data-close-form]').forEach(function (button) {
		button.addEventListener('click', closeModal);
	});

	document.addEventListener('keydown', function (event) {
		if ('Escape' === event.key) {
			closeModal();
		}
	});

	// Validation ported from onyca-digital's own contact form (its
	// main.js, initContactForm/setupForm: novalidate on the form,
	// group wrappers marked .is-error, a dedicated paragraph under the
	// consent checkbox instead of relying on the browser's own
	// validation bubble, which is inconsistent across browsers and
	// can't carry that styled message). Adapted to this form's actual
	// fields (name, phone, consent — no project tags/budget here).
	function mptoValidateLeadForm(form) {
		const nameGroup = form.querySelector('[data-required-group="name"]');
		const phoneGroup = form.querySelector('[data-required-group="phone"]');
		const consentGroup = form.querySelector('[data-required-group="consent"]');
		const consentCheck = form.querySelector('.lead-form__consent-check');
		const consentError = form.querySelector('[data-consent-error]');
		const nameInput = form.querySelector('input[name="name"]');
		const phoneInput = form.querySelector('input[name="phone"]');
		const consentInput = form.querySelector('input[name="consent"]');

		const state = {
			name: !nameInput.value.trim(),
			phone: !phoneInput.checkValidity(),
			consent: !consentInput.checked
		};

		if (nameGroup) {
			nameGroup.classList.toggle('is-error', state.name);
		}
		if (phoneGroup) {
			phoneGroup.classList.toggle('is-error', state.phone);
		}
		if (consentGroup) {
			consentGroup.classList.toggle('is-error', state.consent);
		}
		if (consentCheck) {
			consentCheck.classList.toggle('is-error', state.consent);
		}
		if (consentError) {
			consentError.hidden = !state.consent;
		}

		return !(state.name || state.phone || state.consent);
	}

	function mptoScrollToFirstLeadFormError(form) {
		const first = form.querySelector('.is-error');
		if (!first) {
			return;
		}
		const box = first.getBoundingClientRect();
		const visible = box.top >= 0 && box.bottom <= window.innerHeight;
		if (visible) {
			return;
		}
		first.scrollIntoView({ block: 'center', behavior: 'smooth' });
	}

	document.querySelectorAll('[data-lead-form]').forEach(function (form) {
		// Clears an error the moment the field it belongs to is fixed,
		// rather than leaving it red until the next submit attempt.
		form.addEventListener('input', function () {
			if (form.querySelector('.is-error')) {
				mptoValidateLeadForm(form);
			}
		});
		form.addEventListener('change', function () {
			if (form.querySelector('.is-error')) {
				mptoValidateLeadForm(form);
			}
		});

		form.addEventListener('submit', async function (event) {
			event.preventDefault();

			if (!mptoValidateLeadForm(form)) {
				mptoScrollToFirstLeadFormError(form);
				return;
			}

			const button = form.querySelector('button[type="submit"]');
			const status = form.querySelector('[data-form-status]');
			const originalMarkup = button.innerHTML;
			const formData = new FormData(form);

			button.disabled = true;
			button.textContent = mptoData.strings.sending;
			status.textContent = '';
			status.classList.remove('is-error', 'is-success');

			try {
				const response = await fetch(mptoData.ajaxUrl, {
					method: 'POST',
					credentials: 'same-origin',
					body: formData
				});
				const result = await response.json();

				if (!response.ok || !result.success) {
					throw new Error(result.data && result.data.message ? result.data.message : mptoData.strings.error);
				}

				form.reset();
				form.querySelectorAll('.is-error').forEach(function (el) {
					el.classList.remove('is-error');
				});
				const consentError = form.querySelector('[data-consent-error]');
				if (consentError) {
					consentError.hidden = true;
				}
				const cityField = form.querySelector('input[name="city"]');
				const activeCity = document.querySelector('.city-tab.is-active');
				if (cityField && activeCity) {
					cityField.value = activeCity.dataset.cityName || cityField.value;
				}
				status.textContent = result.data.message || mptoData.strings.success;
				status.classList.add('is-success');
			} catch (error) {
				status.textContent = error.message || mptoData.strings.error;
				status.classList.add('is-error');
			} finally {
				button.disabled = false;
				button.innerHTML = originalMarkup;
			}
		});
	});

	const cityButtons = document.querySelectorAll('[data-city-select]');
	const mapElement = document.querySelector('.js-lazy-yandex-map');
	if (cityButtons.length) {
		cityButtons.forEach(function (button) {
			button.addEventListener('click', function () {
				cityButtons.forEach(function (cityButton) {
					const isSameCity = cityButton.dataset.citySelect === button.dataset.citySelect;
					cityButton.classList.toggle('is-active', isSameCity);
					cityButton.setAttribute('aria-selected', String(isSameCity));
				});

				const name = button.dataset.cityName || '';
				const address = button.dataset.cityAddress || '';
				const phone = button.dataset.cityPhone || '';
				const phoneParts = phone.split(',');
				const phonePrimary = (phoneParts[0] || '').trim();
				const phoneSecondary = (phoneParts[1] || '').trim();
				const email = button.dataset.cityEmail || '';
				const manager = button.dataset.cityManager || '';
				const mapUrl = button.dataset.cityMap || '';
				const phoneLink = document.querySelector('[data-contact-phone]');
				const emailWraps = document.querySelectorAll('[data-contact-email-wrap]');
				const emailLinks = document.querySelectorAll('[data-contact-email]');
				const contactHeading = document.querySelector('[data-contact-heading]');
				const contactCity = document.querySelector('[data-contact-city]');
				const contactPanel = document.querySelector('#city-contact-panel');
				const contactAddresses = document.querySelectorAll('[data-contact-address]');
				const contactManagerWrap = document.querySelector('[data-contact-manager-wrap]');
				const contactManager = document.querySelector('[data-contact-manager]');
				const contactFormCities = document.querySelectorAll('.lead-form input[name="city"]');
				const sitePhonesPrimary = document.querySelectorAll('[data-site-phone-primary]');
				const sitePhonesSecondary = document.querySelectorAll('[data-site-phone-secondary]');
				const siteCityNames = document.querySelectorAll('[data-site-city-name]');

				if (contactHeading) contactHeading.textContent = name;
				if (contactCity) contactCity.textContent = name;
				if (contactPanel) contactPanel.setAttribute('aria-labelledby', 'city-tab-' + button.dataset.citySelect);
				contactAddresses.forEach(function (addressEl) {
					addressEl.textContent = address;
				});
				siteCityNames.forEach(function (nameEl) {
					nameEl.textContent = name;
				});
				if (phoneLink) {
					phoneLink.textContent = phonePrimary;
					phoneLink.href = 'tel:' + phonePrimary.replace(/[^\d+]/g, '');
				}
				sitePhonesPrimary.forEach(function (sitePhone) {
					sitePhone.textContent = phonePrimary;
					sitePhone.href = 'tel:' + phonePrimary.replace(/[^\d+]/g, '');
				});
				sitePhonesSecondary.forEach(function (sitePhoneSecondary) {
					sitePhoneSecondary.textContent = phoneSecondary;
					sitePhoneSecondary.hidden = !phoneSecondary;
				});
				emailLinks.forEach(function (emailLink) {
					emailLink.textContent = email;
					emailLink.href = email ? 'mailto:' + email : '';
				});
				emailWraps.forEach(function (emailWrap) {
					emailWrap.hidden = !email;
				});
				contactFormCities.forEach(function (cityField) {
					cityField.value = name;
				});
				if (mapElement) {
					mapElement.setAttribute('aria-label', 'Карта: ' + name);
					document.dispatchEvent(new CustomEvent('mpto:city-change', { detail: { mapUrl: mapUrl } }));
				}

				const url = new URL(window.location.href);
				url.searchParams.set('city', button.dataset.citySelect);
				window.history.replaceState({}, '', url);
			});
		});
	}

	const hoverList = document.querySelector('[data-hover-list]');
	const hoverPreview = hoverList ? hoverList.querySelector('[data-hover-preview]') : null;
	if (hoverList && hoverPreview) {
		const hoverRows = hoverList.querySelectorAll('[data-hover-row]');
		const mediaPanels = hoverPreview.querySelectorAll('[data-preview-media]');
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const panelWidth = hoverPreview.offsetWidth || 460;
		const panelHeight = hoverPreview.offsetHeight || 380;
		const margin = 20;

		let activeIndex = null;
		let targetX = 0;
		let targetY = 0;
		let currentX = 0;
		let currentY = 0;
		let raf = null;

		function setPanelState(panel, state) {
			panel.classList.remove('is-current', 'is-enter-down', 'is-enter-up', 'is-exit-down', 'is-exit-up');
			if (state) {
				panel.classList.add(state);
			}
		}

		function switchMedia(index) {
			const direction = (activeIndex === null || index > activeIndex) ? 'down' : 'up';
			const nextPanel = hoverPreview.querySelector('[data-panel-index="' + index + '"]');
			const prevPanel = activeIndex === null ? null : hoverPreview.querySelector('[data-panel-index="' + activeIndex + '"]');
			if (!nextPanel) {
				return;
			}

			if (activeIndex === null) {
				setPanelState(nextPanel, 'is-current');
			} else {
				nextPanel.style.transition = 'none';
				setPanelState(nextPanel, direction === 'down' ? 'is-enter-down' : 'is-enter-up');
				void nextPanel.offsetHeight;
				nextPanel.style.transition = '';

				window.requestAnimationFrame(function () {
					setPanelState(nextPanel, 'is-current');
					if (prevPanel) {
						setPanelState(prevPanel, direction === 'down' ? 'is-exit-down' : 'is-exit-up');
					}
				});
			}

			activeIndex = index;
		}

		function tick() {
			const ease = reduceMotion ? 1 : 0.2;
			currentX += (targetX - currentX) * ease;
			currentY += (targetY - currentY) * ease;
			hoverPreview.style.transform = 'translate3d(' + currentX + 'px,' + currentY + 'px,0)';
			if (Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) {
				raf = window.requestAnimationFrame(tick);
			} else {
				raf = null;
			}
		}

		function startTick() {
			if (!raf) {
				raf = window.requestAnimationFrame(tick);
			}
		}

		// Clamped to the section's own box (computed fresh each call, so
		// scrolling keeps it correct), not window.innerWidth/innerHeight
		// — the previous viewport clamp let the panel follow the cursor
		// anywhere on screen, including well above or below this section
		// once scrolled, which is what made it look unbounded. Bounding to
		// .mpto-directions itself (just the row list) instead of this
		// section was too short for the 380px-tall panel plus margins —
		// the clamp range collapsed to a few px and the panel stopped
		// visibly moving on Y at all. Bound to the whole block instead.
		const boundsEl = hoverList.closest('.mpto-directions-section') || hoverList;

		function pointFromEvent(event) {
			const listRect = boundsEl.getBoundingClientRect();
			let x = event.clientX - panelWidth / 2;
			let y = event.clientY - panelHeight / 2;
			x = Math.max(listRect.left + margin, Math.min(x, listRect.right - panelWidth - margin));
			y = Math.max(listRect.top + margin, Math.min(y, listRect.bottom - panelHeight - margin));
			return { x: x, y: y };
		}

		let lastPointerEvent = null;

		hoverList.addEventListener('mousemove', function (event) {
			lastPointerEvent = event;
			const point = pointFromEvent(event);
			targetX = point.x;
			targetY = point.y;
			startTick();
		});

		// A scroll with no mouse movement (wheel/trackpad while the cursor
		// sits still) never fires 'mousemove', so without this the panel
		// would keep its old target and visibly drift from the row it's
		// supposed to track as the page moves under it.
		window.addEventListener('scroll', function () {
			if (!lastPointerEvent || activeIndex === null) {
				return;
			}
			const point = pointFromEvent(lastPointerEvent);
			targetX = point.x;
			targetY = point.y;
			startTick();
		}, { passive: true });

		hoverRows.forEach(function (row) {
			row.addEventListener('mouseenter', function (event) {
				lastPointerEvent = event;
				const index = Number(row.dataset.rowIndex);
				const wasInactive = activeIndex === null;
				if (wasInactive) {
					const point = pointFromEvent(event);
					currentX = targetX = point.x;
					currentY = targetY = point.y;
					hoverPreview.style.transform = 'translate3d(' + currentX + 'px,' + currentY + 'px,0)';
				}
				if (index !== activeIndex) {
					switchMedia(index);
				}
				hoverPreview.classList.add('is-active');
			});
		});

		hoverList.addEventListener('mouseleave', function () {
			hoverPreview.classList.remove('is-active');
			activeIndex = null;
		});
	}

	// Y-axis-only cursor-follow preview for the homepage news list —
	// see assets/css/news-preview.css's comment for where this technique
	// is from. Modeled on the directions-list hover preview above (same
	// lerp-via-rAF, same bounded-to-its-own-box fix), not sharing code
	// with it: that one centers on the cursor on both axes and fades
	// out on mouseleave — this one only ever moves on Y, sits in the
	// row's own image column (not a fixed side column), and never hides.
	const newsHoverWrap = document.querySelector('[data-news-hover]');
	const newsPreview = newsHoverWrap ? newsHoverWrap.querySelector('[data-news-preview]') : null;
	if (newsHoverWrap && newsPreview) {
		const newsRows = newsHoverWrap.querySelectorAll('[data-news-row]');
		const newsMediaPanels = newsPreview.querySelectorAll('[data-news-preview-media]');
		const newsReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const newsFollowSpeed = newsReduceMotion ? 1 : 0.25;

		// Not every row necessarily has its own thumbnail (a post without
		// a featured image just gets no media panel at all), so the
		// initial row to show can't just be assumed to be index 0 — it's
		// whichever row actually has a panel, found first in list order.
		const newsFirstMediaIndex = newsMediaPanels.length ? Number(newsMediaPanels[0].dataset.panelIndex) : 0;
		const newsInitialRow = newsHoverWrap.querySelector('[data-row-index="' + newsFirstMediaIndex + '"]');

		let newsPreviewHeight = newsPreview.offsetHeight || 200;
		let newsActiveIndex = newsFirstMediaIndex;
		let newsTargetY = 0;
		let newsCurrentY = 0;
		let newsRaf = null;
		let newsLastEvent = null;

		// Horizontal position isn't animated — just matched once (and on
		// resize) to the actual gap between the text and the arrow on the
		// initial row, filling most (not all) of the free space there —
		// a touch of margin on both sides reads better than the image
		// running edge-to-edge against the text and the arrow.
		function newsPositionHorizontally() {
			if (!newsInitialRow) {
				return;
			}
			const textEl = newsInitialRow.querySelector('.mpto-news-row__text');
			const arrowEl = newsInitialRow.querySelector('.mpto-news-row__arrow');
			if (!textEl || !arrowEl) {
				return;
			}
			const wrapRect = newsHoverWrap.getBoundingClientRect();
			const textRect = textEl.getBoundingClientRect();
			const arrowRect = arrowEl.getBoundingClientRect();
			const gap = 24;
			const gapLeft = textRect.right + gap;
			const gapWidth = Math.max(0, (arrowRect.left - gap) - gapLeft);
			const width = gapWidth * 0.82;
			const left = gapLeft + (gapWidth - width) / 2;
			newsPreview.style.left = (left - wrapRect.left) + 'px';
			newsPreview.style.width = width + 'px';
			newsPreviewHeight = newsPreview.offsetHeight || newsPreviewHeight;
		}

		// The panel is free to hang past the list's own bottom edge (the
		// list doesn't clip it — no overflow:hidden on the wrap), but
		// only as far as the next section's own top edge — otherwise it
		// can end up sitting on top of whatever comes after (the yellow
		// CTA block on the homepage). A fixed px allowance doesn't know
		// how much space is actually there, so this measures it directly
		// each time instead.
		const newsSection = newsHoverWrap.closest('.mpto-news-row-section');
		const newsNextSection = newsSection ? newsSection.nextElementSibling : null;

		function newsBounds() {
			const wrapRect = newsHoverWrap.getBoundingClientRect();
			const minY = 0;
			const spaceBelow = newsNextSection
				? (newsNextSection.getBoundingClientRect().top - wrapRect.bottom)
				: 0;
			const maxY = Math.max(minY, wrapRect.height - newsPreviewHeight + Math.max(0, spaceBelow));
			return { wrapRect: wrapRect, minY: minY, maxY: maxY };
		}

		function newsPointFromEvent(event) {
			const bounds = newsBounds();
			const y = event.clientY - bounds.wrapRect.top - newsPreviewHeight / 2;
			return Math.max(bounds.minY, Math.min(y, bounds.maxY));
		}

		function newsTick() {
			newsCurrentY += (newsTargetY - newsCurrentY) * newsFollowSpeed;
			newsPreview.style.transform = 'translate3d(0,' + newsCurrentY + 'px,0)';
			if (Math.abs(newsTargetY - newsCurrentY) > 0.5) {
				newsRaf = window.requestAnimationFrame(newsTick);
			} else {
				newsRaf = null;
			}
		}

		function newsStartTick() {
			if (!newsRaf) {
				newsRaf = window.requestAnimationFrame(newsTick);
			}
		}

		function newsSwitchMedia(index) {
			newsMediaPanels.forEach(function (panel) {
				panel.classList.toggle('is-current', Number(panel.dataset.panelIndex) === index);
			});
			newsActiveIndex = index;
		}

		newsPositionHorizontally();
		newsSwitchMedia(newsFirstMediaIndex);
		if (newsInitialRow) {
			const wrapRect = newsHoverWrap.getBoundingClientRect();
			const rowRect = newsInitialRow.getBoundingClientRect();
			// 40px higher than dead-centre on the row — reads better as
			// the resting position before anything's been hovered yet.
			newsCurrentY = newsTargetY = Math.max(0, rowRect.top - wrapRect.top - (rowRect.height - newsPreviewHeight) / 2 - 40);
			newsPreview.style.transform = 'translate3d(0,' + newsCurrentY + 'px,0)';
		}
		window.addEventListener('resize', newsPositionHorizontally);

		newsRows.forEach(function (row) {
			row.addEventListener('mouseenter', function (event) {
				newsLastEvent = event;
				const index = Number(row.dataset.rowIndex);
				newsTargetY = newsPointFromEvent(event);
				newsStartTick();
				if (index !== newsActiveIndex) {
					newsSwitchMedia(index);
				}
			});

			row.addEventListener('mousemove', function (event) {
				newsLastEvent = event;
				newsTargetY = newsPointFromEvent(event);
				newsStartTick();
			});
		});

		// No mouseleave handler on purpose — the panel stays put, showing
		// whichever post was last hovered (or the first/latest one, if
		// none has been yet), instead of fading out.

		// The cursor's screen position (clientX/Y) doesn't change from a
		// scroll alone, but which row sits under it does — without this,
		// scrolling with the mouse still would leave the preview tracking
		// Y correctly but showing the wrong post's image.
		function newsRowUnderEvent(event) {
			const el = document.elementFromPoint(event.clientX, event.clientY);
			return el ? el.closest('[data-news-row]') : null;
		}

		window.addEventListener('scroll', function () {
			if (!newsLastEvent) {
				return;
			}
			newsTargetY = newsPointFromEvent(newsLastEvent);
			newsStartTick();
			const row = newsRowUnderEvent(newsLastEvent);
			if (row) {
				const index = Number(row.dataset.rowIndex);
				if (index !== newsActiveIndex && newsPreview.querySelector('[data-panel-index="' + index + '"]')) {
					newsSwitchMedia(index);
				}
			}
		}, { passive: true });
	}

	// The hero→directions curve's scroll-driven animation is parked in
	// wave.js, not run right now — see that file and assets/css/wave.css.

	const cityDropdown = document.querySelector('[data-city-dropdown]');
	const cityToggle = document.querySelector('[data-city-toggle]');
	const cityPanel = document.querySelector('[data-city-panel]');
	if (cityDropdown && cityToggle && cityPanel) {
		const closeCityDropdown = function () {
			cityToggle.setAttribute('aria-expanded', 'false');
			cityPanel.hidden = true;
		};
		cityToggle.addEventListener('click', function () {
			const isOpen = cityToggle.getAttribute('aria-expanded') === 'true';
			cityToggle.setAttribute('aria-expanded', String(!isOpen));
			cityPanel.hidden = isOpen;
		});
		document.addEventListener('click', function (event) {
			if (!cityDropdown.contains(event.target)) closeCityDropdown();
		});
		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape') closeCityDropdown();
		});
		cityPanel.querySelectorAll('[data-city-select]').forEach(function (button) {
			button.addEventListener('click', closeCityDropdown);
		});
	}
});
