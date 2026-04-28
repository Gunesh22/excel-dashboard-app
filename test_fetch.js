(async () => {
    try {
        const res = await fetch('http://localhost:5176/src/main.jsx');
        const text = await res.text();
        console.log(text.substring(0, 500));
    } catch (err) {
        console.error(err);
    }
})();
