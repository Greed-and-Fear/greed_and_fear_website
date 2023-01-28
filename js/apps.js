const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        console.log(entry);
        if(entry.isIntersecting){
            entry.target.classList.add('show');
        }
        else{
            entry.target.classList.remove('show');
        }
    });
  });

const hiddenelement = document.querySelectorAll('.hidden');
hiddenelement.forEach((el)=>observer.observe(el));

const hiddenelement2 = document.querySelectorAll('.hidden2');
hiddenelement2.forEach((el2)=>observer.observe(el2));