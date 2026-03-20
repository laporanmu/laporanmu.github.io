import { useState, useRef, useCallback } from 'react';

/**
 * useLongPress custom hook
 * @param {Function} onLongPress - Callback when long press is detected
 * @param {Object} options - { delay, onClick }
 */
export default function useLongPress(onLongPress, { delay = 500, onClick = null } = {}) {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timerRef = useRef();
    const sourceRef = useRef();

    const start = useCallback((event) => {
        event.persist();
        setLongPressTriggered(false);
        sourceRef.current = event.target;
        timerRef.current = setTimeout(() => {
            onLongPress(event);
            setLongPressTriggered(true);
        }, delay);
    }, [onLongPress, delay]);

    const clear = useCallback((event, shouldTriggerClick = true) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (shouldTriggerClick && !longPressTriggered && onClick) {
            onClick(event);
        }
        setLongPressTriggered(false);
    }, [longPressTriggered, onClick]);

    return {
        onMouseDown: (e) => start(e),
        onTouchStart: (e) => start(e),
        onMouseUp: (e) => clear(e),
        onMouseLeave: (e) => clear(e, false),
        onTouchEnd: (e) => clear(e),
    };
}
