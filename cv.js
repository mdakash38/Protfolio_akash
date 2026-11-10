document.addEventListener("DOMContentLoaded", function () {

    const printButton = document.getElementById("printCV");

    if (printButton) {
        printButton.addEventListener("click", function () {
            window.print();
        });
    }

});