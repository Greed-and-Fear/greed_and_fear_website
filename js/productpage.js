function load_product_page(product_id){
    window.open("productpage.html","_self");
    document.addEventListener("click", load_product)
}


function load_product(){
    console.log(product_id)
    // document.getElementById('product-details').innerHTML = 'hello'
}
