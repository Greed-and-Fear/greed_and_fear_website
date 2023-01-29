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

const hiddenelement = document.querySelectorAll('.hidden');

hiddenelement.forEach((el)=>observer.observe(el));
