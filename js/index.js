function getVal() {
    var name = document.getElementById("name").value;
    var pass= document.getElementById("psw").value;
    if(name === "admin"){
        if(pass == "12345")
        {
            window.open("mainpage.html","_self");
        } 
    } 
    else
    {
        window.alert("Incorrect Username or password");
        clear_data()
        
    }
  }

function clear_data()
{
    document.getElementById("name").value = ""
    document.getElementById("psw").value = ''
}

const togglePassword = document.querySelector('#togglePassword');
  const password = document.querySelector('#psw');

  togglePassword.addEventListener('click', function() {
    // toggle the type attribute
    const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    password.setAttribute('type', type);
    // toggle the eye slash icon
    this.classList.toggle('fa-eye-slash');
});