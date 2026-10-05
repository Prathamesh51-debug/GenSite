export const iframeScript = `
        <style id="ai-preview-style">
        .ai-selected-element {
            outline: 2px solid #2F5D50 !important;
        }
        </style>
        <script id="ai-preview-script">
        (function () {
            // If this HTML is opened directly (not in an iframe), do nothing.
            if (window === window.parent) {
            return;
            }

            let selectedElement = null;

            function clearSelected() {
            if (selectedElement) {
                selectedElement.classList.remove('ai-selected-element');
                selectedElement.removeAttribute('data-ai-selected');
                selectedElement.style.outline = '';
                selectedElement = null;
            }
            }

            document.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            clearSelected();

            const target = e.target;

            // Don't select body or html
            if (!target || target.tagName === 'BODY' || target.tagName === 'HTML') {
                window.parent.postMessage({ type: 'CLEAR_SELECTION' }, '*');
                return;
            }

            selectedElement = target;
            const cleanOuterHTML = selectedElement.outerHTML;
            const cleanClassName = selectedElement.className;
            selectedElement.classList.add('ai-selected-element');
            selectedElement.setAttribute('data-ai-selected', 'true');

            const computedStyle = window.getComputedStyle(selectedElement);

            window.parent.postMessage({
                type: 'ELEMENT_SELECTED',
                payload: {
                tagName: selectedElement.tagName,
                className: cleanClassName,
                text: selectedElement.innerText,
                outerHTML: cleanOuterHTML,
                styles: {
                    padding: computedStyle.padding,
                    margin: computedStyle.margin,
                    backgroundColor: computedStyle.backgroundColor,
                    color: computedStyle.color,
                    fontSize: computedStyle.fontSize
                }
                }
            }, '*');
            });

            window.addEventListener('message', function (event) {
            if (event.data.type === 'UPDATE_ELEMENT' && selectedElement) {
                const updates = event.data.payload;

                if (updates.className !== undefined) {
                selectedElement.className = updates.className;
                }

                if (updates.text !== undefined) {
                selectedElement.innerText = updates.text;
                }

                if (updates.styles) {
                Object.assign(selectedElement.style, updates.styles);
                }
            } else if (event.data.type === 'REPLACE_ELEMENT' && selectedElement) {
                // "Apply with AI" returns the whole element re-written. Swap the
                // selected node for the new markup. Without this branch the edit was
                // silently dropped (element never changed, credits still spent).
                var __wrap = document.createElement('div');
                __wrap.innerHTML = event.data.html || '';
                var __new = __wrap.firstElementChild;
                if (__new) {
                    __new.classList.remove('ai-selected-element');
                    __new.removeAttribute('data-ai-selected');
                    selectedElement.replaceWith(__new);
                    selectedElement = null;
                }
            } else if (event.data.type === 'CLEAR_SELECTION_REQUEST') {
                clearSelected();

                // extra safety: remove our class + outline from any stray elements
                document.querySelectorAll('.ai-selected-element,[data-ai-selected]').forEach(function (el) {
                el.classList.remove('ai-selected-element');
                el.removeAttribute('data-ai-selected');
                el.style.outline = '';
                });
            }
            });
        })();
        </script>
`;
