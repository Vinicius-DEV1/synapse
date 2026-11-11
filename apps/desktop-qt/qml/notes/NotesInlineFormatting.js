.pragma library

function toggle(source, start, end, opening, closing) {
    var first = Math.min(start, end)
    var last = Math.max(start, end)
    var hasSelection = first !== last
    var wrapped = hasSelection && first >= opening.length &&
        source.substring(first - opening.length, first) === opening &&
        source.substring(last, last + closing.length) === closing
    if (wrapped) {
        return {
            editStart: first - opening.length,
            editEnd: last + closing.length,
            replacement: source.substring(first, last),
            start: first - opening.length,
            end: last - opening.length
        }
    }
    return {
        editStart: first,
        editEnd: last,
        replacement: opening + source.substring(first, last) + closing,
        start: first + opening.length,
        end: last + opening.length
    }
}
