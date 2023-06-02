

function getVal() 
{
    var namepass = [
        {
            "name":"admin",
            "pass":"12345"
        },
        {
            "name":"sujay",
            "pass":"12345"
        },
        {
            "name":"johnson",
            "pass":"12345"
        },
        {
            "name":"roshu",
            "pass":"112233"
        }
    ]
    


    var uname = document.getElementById("name").value;
    var pass= document.getElementById("psw").value;
    var user_found = 0
    for (const x of namepass) {
        if (uname === x.name) {
            var user_found = 1
            if(pass === x.pass){
                window.open("mainpage.html","_self");
                break
                }
                else{
                    window.alert("incorrect password")
                }

            }
            else{
                continue
            }
        }
        if(user_found === 0){
            window.alert('Username not found')
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

function load_login(){
    document.getElementById('register').style.display = "none";
    document.getElementById('login').style.display = "block";
    }
function load_register(){
document.getElementById('register').style.display = "block";
document.getElementById('login').style.display = "none";
}

load_login()