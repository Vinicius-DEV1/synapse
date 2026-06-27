const s = "empresa";
console.log("Original:", s);
console.log("Replaced:", s.replace(/[^\w\sÀ-ÿ.,!?;:]+$/g, ''));
console.log("Replaced 2:", s.replace(/[^a-zA-Z0-9\sÀ-ÿ.,!?;:]+$/g, ''));
