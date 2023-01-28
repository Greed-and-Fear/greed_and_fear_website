const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if(entry.isIntersecting){
            entry.target.classList.add('show');
        }
        else{   
            entry.target.classList.remove('show');
        }
    });
  });
  
const hiddenelement2 = document.querySelectorAll('.hidden2');
const hiddenelement = document.querySelectorAll('.hidden');

hiddenelement2.forEach((el2)=>observer.observe(el2));
hiddenelement.forEach((el)=>observer.observe(el));
