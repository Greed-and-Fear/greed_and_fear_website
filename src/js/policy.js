
// Create cookie
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

// Delete cookie
function deleteCookie(cname) {
    const d = new Date();
    d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=;" + expires + ";path=/";
}

// Read cookie
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

// Set cookie consent
function acceptCookieConsent() {
    deleteCookie('user_cookie_consent');
    setCookie('user_cookie_consent', 1, 30);

    document.getElementById("cookies-container").style.display = "none";
}

function rejectCookieConsent() {
    document.getElementById("cookies-container").style.display = "none";
}



cookie_msg = `<div class="cookie-doc-container-header">COOKIE POLICY</div>
<div class="cookie-doc-container-sub-head date-of-policy">Last updated June 10, 2023</div>

<div class="cookie-text">This Cookie Policy explains how Termly ("Company," "we," "us," and "our") uses cookies
    and similar technologies to recognize you when you visit our website at https://greedandfear.fun
    ("Website"). It explains what these technologies are and why we use them, as well as your rights to control
    our use of them.</div>

<div class="cookie-text">In some cases we may use cookies to collect personal information, or that becomes
    personal information if we combine it with other information.</div>

<div class="cookie-doc-container-sub-head">What are cookies?</div>

<div class="cookie-text">Cookies are small data files that are placed on your computer or mobile device when you
    visit a website. Cookies are widely used by website owners in order to make their websites work, or to work
    more efficiently, as well as to provide reporting information.</div>

<div class="cookie-text">Cookies set by the website owner (in this case, Termly) are called "first-party
    cookies." Cookies set by parties other than the website owner are called "third-party cookies." Third-party
    cookies enable third-party features or functionality to be provided on or through the website (e.g.,
    advertising, interactive content, and analytics). The parties that set these third-party cookies can
    recognize your computer both when it visits the website in question and also when it visits certain other
    websites.</div>

<div class="cookie-doc-container-sub-head">Why do we use cookies?</div>

<div class="cookie-text">We use first- and third-party cookies for several reasons. Some cookies are required
    for technical reasons in order for our Website to operate, and we refer to these as "essential" or "strictly
    necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance
    the experience on our Online Properties. Third parties serve cookies through our Website for advertising,
    analytics, and other purposes. This is described in more detail below.</div>

<div class="cookie-doc-container-sub-head">How can I control cookies?</div>

<div class="cookie-text">You have the right to decide whether to accept or reject cookies. You can exercise your
    cookie rights by setting your preferences in the Cookie Consent Manager. The Cookie Consent Manager allows
    you to select which categories of cookies you accept or reject. Essential cookies cannot be rejected as they
    are strictly necessary to provide you with services.</div>

<div class="cookie-text">The Cookie Consent Manager can be found in the notification banner and on our website.
    If you choose to reject cookies, you may still use our website though your access to some functionality and
    areas of our website may be restricted. You may also set or amend your web browser controls to accept or
    refuse cookies.</div>

<div class="cookie-text">The specific types of first- and third-party cookies served through our Website and the
    purposes they perform are described in the table below (please note that the specific cookies served may
    vary depending on the specific Online Properties you visit):</div>

<div class="cookie-doc-container-sub-head">Essential website cookies:</div>

<div class="cookie-text">These cookies are strictly necessary to provide you with services available through our
    Website and to use some of its features, such as access to secure areas.</div>

<div class="cookie-box">
    Name:user_cookie_consent<br>
    Purpose:This cookie holds wether user accepted the cookies.<br>
    Provider:.greeandfear.fun<br>
    Country:India<br>
    Type:https_cookie<br>
    Expires in:30 days<br>
</div>

<div class="cookie-close"><button class="cookie-close-btn" onclick="hidecookiepolicy()">Close</button></div>`



async function showtcpolicy() {
    fetch('https://api.greedandfear.fun/api/tc/', {headers: {'Accept': 'application/json',}})
    .then(function (response) {
            return response.json();})
    .then(function (all_tc) {
            let out = `<div class="cookie-doc-container-header">TERMS & CONDITIONS</div>
            <div class="cookie-doc-container-sub-head date-of-policy">Last updated June 10, 2023</div>  
            <div class="cookie-text">Welcome to Greed and Fear! These Terms and Conditions ("Terms") govern your use of the Greed and Fear ecommerce website ("Website"). By accessing or using our Website, you agree to be bound by these Terms. If you do not agree with these Terms, please do not use our Website.</div>
            <div class="cookie-text">In some cases we may use cookies to collect personal information, or that becomespersonal information if we combine it with other information.</div>
            `;
            for (let single_tc of all_tc) {
                out +=
                    `

                <div class="cookie-doc-container-sub-head">${single_tc.policy_number}. ${single_tc.policy_heading}:</div>
                <div class="cookie-text">${single_tc.policy_text}</div>

                `;
            }
            out += `
        
        <div class="cookie-close"><button class="cookie-close-btn" onclick="hidetcpolicy()">Close</button></div>
        `
            document.getElementById("cookie-doc-container-tc").innerHTML = out;
            document.getElementById("cookie-doc-container-tc").style.display = "block";
        })
}


let cookie_consent = getCookie("user_cookie_consent");
if (cookie_consent != "") {
    document.getElementById("cookies-container").style.display = "none";
} else {
    document.getElementById("cookies-container").style.display = "block";
}

function hidecookiepolicy() {
    document.getElementById("cookie-doc-container").style.display = "none";
}

function showcookiepolicy() {
    document.getElementById("cookie-doc-container").innerHTML = cookie_msg;
    document.getElementById("cookie-doc-container").style.display = "block";
}

function hidetcpolicy() {
    document.getElementById("cookie-doc-container-tc").style.display = "none";
}


