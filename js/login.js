function getVal() {
    var name = document.getElementById("name").value;
    var pass= document.getElementById("psw").value;
    if(name === "admin"){
        if(pass == "12345")
        {
            window.open("index.html")
        } 
    } 
    else
    {
        window.alert("Incorrect Username or password")
    }
  }

function load()
{
    window.alert("Incorrect Username or Password")
}