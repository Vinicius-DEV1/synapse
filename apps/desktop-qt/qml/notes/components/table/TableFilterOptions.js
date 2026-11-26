.pragma library

function operatorsForType(columnType) {
    if (columnType === "number") {
        return [
            { id: "equals", label: "=" }, { id: "not_equals", label: "≠" },
            { id: "gt", label: ">" }, { id: "gte", label: "≥" },
            { id: "lt", label: "<" }, { id: "lte", label: "≤" },
            { id: "between", label: "Entre" }, { id: "empty", label: "Vazio" },
            { id: "not_empty", label: "Não vazio" }
        ]
    }
    if (columnType === "date") {
        return [
            { id: "equals", label: "Igual" }, { id: "before", label: "Antes de" },
            { id: "after", label: "Depois de" }, { id: "between", label: "Entre" },
            { id: "empty", label: "Vazio" }, { id: "not_empty", label: "Não vazio" }
        ]
    }
    if (columnType === "checkbox")
        return [{ id: "is", label: "É" }, { id: "is_not", label: "Não é" }]
    if (columnType === "select") {
        return [
            { id: "is", label: "É" }, { id: "is_not", label: "Não é" },
            { id: "empty", label: "Vazio" }, { id: "not_empty", label: "Não vazio" }
        ]
    }
    return [
        { id: "contains", label: "Contém" }, { id: "not_contains", label: "Não contém" },
        { id: "equals", label: "Igual" }, { id: "not_equals", label: "Diferente" },
        { id: "empty", label: "Vazio" }, { id: "not_empty", label: "Não vazio" }
    ]
}
