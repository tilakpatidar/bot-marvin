{"entries":[],"sitemaps":[],"defaultEntry":"","disallowAll":false,"statusCode":200,"allowAll":false,"options":{"headers":{"userAgent":"Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0"}},"url":"https://login.microsoftonline.com:443/","chunks":["<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01//EN\" \"http://www.w3.org/TR/html4/strict.dtd\">\r\n<html dir=\"ltr\">\r\n    <head>\r\n        <meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\">\r\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\r\n<meta http-equiv=\"Pragma\" content=\"no-cache\">\r\n<meta http-equiv=\"Expires\" content=\"-1\">\r\n<meta name=\"PageID\" content=\"i5030.2.0\" />\r\n<meta name=\"SiteID\" content=\"\" />\r\n<meta name=\"ReqLC\" content=\"1033\" />\r\n<meta name=\"LocLC\" content=\"en-US\" />\r\n<meta name=\"mswebdialog-newwindowurl\" content=\"*\" />\r\n<link rel=\"SHORTCUT ICON\" href=\"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/images/favicon_a.ico\" />\r\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes\" />\r\n        <link href=\"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/css/login.ltr.css\" rel=\"stylesheet\" type=\"text/css\" />\r\n\r\n\r\n<style>\r\n    .no_display {\r\n        display: none;\r\n    }\r\n</style>\r\n\r\n<!--[if lte IE 10]>\r\n  <link href=\"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/css/login.ie.css\" rel=\"stylesheet\" type=\"text/css\" />\r\n<![endif]-->\r\n<!--[if lte IE 7]>\r\n  <style type='text/css'>\r\n    .ie_legacy { display: none; }\r\n    body { background-color: #0072C6; }\r\n  </style>\r\n<![endif]-->\r\n<script type=\"text/javascript\">    \r\n    if ((navigator.userAgent.match(/iPad/) || navigator.userAgent.match(/iPhone/))\r\n        && (window.innerWidth)) {\r\n        try {                        \r\n            viewport = document.querySelector(\"meta[name=viewport]\");\r\n            viewport.setAttribute('content', 'width=' + window.innerWidth + ', initial-scale=1.0, maximum-scale=1.0');\r\n            window.onresize = function(event) {\r\n                viewport.setAttribute('content', 'width=' + window.innerWidth + ', initial-scale=1.0, maximum-scale=1.0');\r\n            };\r\n            window.onorientationchange = function (event) {\r\n                document.activeElement.blur();\r\n            };\r\n        } catch (err) {     \r\n        }\r\n    }\r\n\r\n    var isTouch =  !!(\"ontouchstart\" in window) || window.navigator.msMaxTouchPoints > 0;\r\n    if (!isTouch && true) {    \r\n        var cssId = 'hovereffect';\r\n        if (!document.getElementById(cssId)) {\r\n            var head = document.getElementsByTagName('head')[0];\r\n            var link = document.createElement('link');\r\n            link.id = cssId;\r\n            link.rel = 'stylesheet';\r\n            link.type = 'text/css';\r\n            link.href = \"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/css/login.hover.css\";\r\n            link.media = 'all';\r\n            head.appendChild(link);\r\n        }\r\n    }\r\n </script>\r\n<script type=\"text/javascript\">\r\n    if (navigator.userAgent.match(/IEMobile\\/10\\.0/)) {\r\n        var msViewportStyle = document.createElement(\"style\");\r\n        msViewportStyle.appendChild(\r\n              document.createTextNode(\r\n                  \"@-ms-viewport{width:auto!important}\"\r\n              )\r\n          );\r\n        msViewportStyle.appendChild(\r\n              document.createTextNode(\r\n                  \"@-ms-viewport{height:auto!important}\"\r\n              )\r\n          );\r\n        document.getElementsByTagName(\"head\")[0].appendChild(msViewportStyle);\r\n    }\r\n</script>\r\n\r\n\r\n<script src=\"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/js/jquery-1.11.2.min.js\" type=\"text/javascript\"></script>\r\n<script src=\"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/js/jquery-migrate-1.2.1.min.js\" type=\"text/javascript\"></script>\r\n<script src=\"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/js/jquery.easing.1.3.js\" type=\"text/javascript\"></script>\r\n<script src=\"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/js/aad.login.min.js\" type=\"text/javascript\"></script>\r\n\r\n    \r\n<style>\r\n    body\r\n    {\r\n        display: none;        \r\n    }\r\n</style>\r\n\r\n        <title>\r\n                        Sign in to Office 365\r\n        </title>    \r\n    </head>\r\n    <body>\r\n            <script>\r\n        if (self == top) {\r\n            var body = $('body');\r\n            body.css('display', 'block');\r\n        } else {\r\n            top.location = self.location;\r\n        }\r\n    </script>\r\n\r\n        \r\n<div id=\"background_branding_container\" class=\"ie_legacy\" style=\"background: #FFFFFF\">\r\n    <img id=\"background_background_image\" alt=\"            Illustration\r\n\">\r\n    <div id=\"auto_low_bandwidth_background_notification\" class=\"smalltext\">It looks like you're on a slow connection. We've disabled some images to speed things up.</div>\r\n    <div id=\"background_company_name_text\" class=\"background_title_text\">\r\n    </div>\r\n</div>\r\n<div id=\"background_page_overlay\" class=\"overlay ie_legacy\">\r\n</div>\r\n\r\n        <div id=\"login_no_script_panel\" class=\"login_panel\">\r\n            <noscript>\r\n    <style>body { display: block; }</style>\r\n    <div class=\"login_inner_container no_js\">\r\n        <div class=\"inner_container cred\">\r\n            <div class=\"login_workload_logo_container\">\r\n            </div>\r\n            <div id=\"login_no_js_error_container\" class=\"login_full_error_container\">\r\n                <div id=\"login_no_js_error_text\" class=\"cta_text 1\">\r\n                    <H1>We can't sign you in</H1><p>Your browser is currently set to block JavaScript. You need to allow JavaScript to use this service.</p><p>To learn how to allow JavaScript or to find out whether your browser supports JavaScript, check the online help in your web browser.</p>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div id=\"footer_links_container\" class=\"login_footer_container\">\r\n    <div class=\"footer_inner_container\">\r\n        <table id=\"footer_table\">\r\n            <tr>\r\n                <td>\r\n                    <div class=\"footer_glyph\">\r\n                        <img src=\"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/images/ad_glyph_footer_30x30.png\" \r\n                                class=\"footer_glyph\" alt=\"Work or school account symbol\" />\r\n                    </div>\r\n                </td>\r\n                <td>\r\n                    <div class=\"footer tinytext\">\r\n                        <span class=\"corporate_footer\"><span class=\"branding_footer\">Your work or school account can be used anywhere you see this symbol.</span>\r\n                                <span class=\"corp_link\" id=\"footer_copyright_link\">\r\n                                    © 2015 Microsoft\r\n                                </span>\r\n                                <span class=\"corp_link\">\r\n                                    <a id=\"footer_link_terms\" tabindex=\"38\" href=\"https://login.microsoftonline.com/termsofuse\">Terms of use</a>\r\n                                </span>\r\n                                <span class=\"corp_link\">\r\n                                    <a id=\"footer_link_privacy\" tabindex=\"39\" href=\"https://login.microsoftonline.com/privacy\">Privacy &amp; Cookies</a>\r\n                                </span>\r\n                        </span>\r\n                    </div>\r\n                </td>\r\n            </tr>\r\n        </table>\r\n    </div>\r\n</div>\r\n<div id=\"login_prefetch_container\" class=\"no_display\">\r\n</div>\r\n\r\n</noscript>\r\n\r\n        </div>\r\n        <div id=\"login_panel\" class=\"login_panel\">\r\n            <div class=\"legal_container\"></div>\r\n            <table class=\"login_panel_layout\" style=\"height: 100%;\">\r\n                <tr class=\"login_panel_layout_row\" style=\"height: 100%;\">\r\n                    <td id=\"login_panel_center\">\r\n                            <script type=\"text/javascript\">\r\n      $(document).ready(function () {\r\n        if ($.support.cookies) {\r\n          $('.login_inner_container').removeClass('no_display');\r\n          $('.no_cookie').addClass('no_display');\r\n        } else {\r\n          $('.login_inner_container').addClass('no_display');\r\n          $('.no_cookie').removeClass('no_display');\r\n        }\r\n      });\r\n    </script>\r\n    <div class=\"login_inner_container no_cookie no_display\">\r\n      <div class=\"inner_container cred\">\r\n        <div class=\"login_workload_logo_container\">\r\n        </div>\r\n        <div id=\"login_no_cookie_error_container\" class=\"login_full_error_container\">\r\n          <div id=\"login_no_cookie_error_text\" class=\"cta_text 1\">\r\n            <H1>We can't sign you in</H1><p>Your browser is currently set to block cookies. You need to allow cookies to use this service.</p><p>Cookies are small text files stored on your computer that tell us when you're signed in. To learn how to allow cookies, check the online help in your web browser.</p>\r\n          </div>\r\n        </div>\r\n      </div>\r\n    </div>\r\n                        <script type=\"text/javascript\">\r\n                            $(document).ready(function () {\r\n                                \r\nConstants.DEFAULT_LOGO = 'https://secure.aadcdn.microsoftonline-p.com/dbd5a2dd-6ybrougjmflxqw910ieyohr7wb4x4-yvoixrlaidmz4/appbranding/askzfdsqe20i-bcjwporaywega7vbt4acqnn1hiliiw/0/bannerlogo?ts=635833785786136122';\r\n\r\n\r\nConstants.DEFAULT_LOGO_ALT = 'Office 365';\r\nConstants.DEFAULT_ILLUSTRATION = 'https://secure.aadcdn.microsoftonline-p.com/dbd5a2dd-6ybrougjmflxqw910ieyohr7wb4x4-yvoixrlaidmz4/appbranding/askzfdsqe20i-bcjwporaywega7vbt4acqnn1hiliiw/0/heroillustration?ts=635833785786917227';\r\nConstants.DEFAULT_BACKGROUND_COLOR = '#EB3C00';\r\nConstants.BOILERPLATE_HEADER = '';\r\nConstants.DEFAULT_BOILERPLATE_HEADER = '';\r\nConstants.DEFAULT_BOILERPLATE_TEXT = '';\r\n\r\n\r\n\r\n    User.UpdateLogo(Constants.DEFAULT_LOGO, Constants.DEFAULT_LOGO_ALT);\r\n    User.UpdateBackground(Constants.DEFAULT_ILLUSTRATION, Constants.DEFAULT_BACKGROUND_COLOR);\r\n    \r\n    if (Constants.DEFAULT_BOILERPLATE_TEXT.length > 0) {\r\n        TenantBranding.AddBoilerPlateText(Constants.DEFAULT_BOILERPLATE_TEXT, Constants.DEFAULT_BOILERPLATE_HEADER);\r\n    }\r\n    \r\n\r\n                                jQuery('img#logo_img').attr('src', '');\r\n                                Context.use_instrumentation = true; \r\n                                User.moveFooterToBottom('250px');\r\n\r\n\r\n                                $('#footer_link_terms').click(function(event) {\r\n                                    event.preventDefault();\r\n                                    MSLogin.Support.LegalActionLink('/termsofuse');\r\n                                });\r\n\r\n                                $('#footer_link_privacy').click(function(event) {\r\n                                    event.preventDefault();\r\n                                    MSLogin.Support.LegalActionLink('/privacy');\r\n                                });\r\n\r\n                                $('#footer_link_privacy_windows').click(function(event) {\r\n                                    var flyoutButton = $('#footer_link_privacy_windows')[0]; // anchor\r\n                                    var flyout = $('#flyoutPrivacyStatement')[0]; // flyout div\r\n                                    var pageTop = $('.body-container')[0].getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0);\r\n                                    flyout.style.marginTop = pageTop + \"px\"; // adjust margin top so flyout doesn't cover header\r\n                                    flyout.winControl.show(flyoutButton, \"top\", \"left\");\r\n                                });\r\n\r\n                                if(!Constants.IS_ADAL_REQUEST) {\r\n                                    $('#create_msa_account_link, #account_not_found_title_text > p > a').click(function(event){\r\n                                        event.preventDefault();\r\n                                        var msaLink = event.target.getAttribute(\"href\");\r\n                                        window.open(msaLink, '_blank');\r\n                                        window.focus();\r\n                                    });\r\n                                } else {\r\n                                    $('#account_not_found_title_text p').toggleClass('no_display');\r\n                                }\r\n                            });\r\n\r\n                        </script>\r\n                        <div class=\"login_inner_container\">\r\n                            <div id=\"true_inner\" class=\"inner_container cred\">                                \r\n                                    <div class=\"login_workload_logo_container\"></div>\r\n                                <div class=\"spacer\"></div>\r\n                                \r\n\r\n<div id=\"login_error_container\" class=\"login_error_container\"></div>\r\n<div class=\"login_cta_container normaltext\">\r\n            <div id=\"login_cta_text\" class=\"cta_message_text 1\">Sign in with your work or school account</div>\r\n    <div id=\"cta_client_message_text\" class=\"no_display template-tooltip tooltipType_error\">\r\n    <!-- Email Discovery Main -->\r\n    <div class=\"cta_message_text 30136\">Type the email address or phone number of the account you want to sign in with.</div>\r\n    <!-- Email Discovery Lookup Timeout -->\r\n    <div class=\"cta_message_text 30140\">We're having trouble locating your account. Which type of account do you want to use?</div>\r\n    <!-- Email Discovery Account not found -->\r\n    <div id=\"upn_needs_disambiguation_text\" class=\"cta_message_text 30139\">\r\n    </div>\r\n    <!-- Tenant branding call to action -->\r\n    <div id=\"tenant_branding_cta_text\" class=\"cta_message_text 30008\">Sign in to {0}</div>\r\n    <!-- Which accound do you want to use -->\r\n    <div class=\"cta_message_text 30173\">Which type of account do you want to sign in with?</div>\r\n</div>\r\n<div id=\"cta_client_error_text\" class=\"error_msg errortext no_display template-tooltip tooltipType_error\">\r\n    <!-- Invalid ID or password -->\r\n    <div class=\"client_error_msg 30067\"><H1>We don't recognize this user ID or password</H1><p>Be sure to type the password for your work or school account.</p></div>\r\n    <!-- Malformed id -->\r\n    <div class=\"client_error_msg 30064\"><H1>This doesn't look like a valid user ID</H1><p>Try using your email address or phone number.</p></div>\r\n    <!-- Malformed id (DOMAIN\\alias format) -->\r\n    <div class=\"client_error_msg 30066\"><H1>This doesn't look like a valid user ID</H1><p>Try using your email address or phone number.</p></div>\r\n    <!-- Invalid domain name (not guests) -->\r\n    <div class=\"client_error_msg 30065 30068\"><H1>We don't recognize this domain name</H1><p>Make sure you typed your organization's domain name correctly. It usually looks like @example.com or @example.onmicrosoft.com.</p></div>\r\n    <!-- Missing password -->\r\n    <div class=\"client_error_msg 30111\">Please enter your password.</div>\r\n    <!-- UserID is missing -->\r\n    <div class=\"client_error_msg 30127\">To sign in, start by entering a user ID.</div>\r\n    <!-- Error message if email address is not properly formatted -->\r\n    <div class=\"client_error_msg 30145\">Check the email address you entered. You may have mistyped it.</div>\r\n    <!-- Email Discovery could not find email address -->\r\n    <div id=\"account_not_found_title_text\" class=\"client_error_msg 30146\"><H1>We couldn't find an account with that email address.</H1><p>Enter a different email address or <A HREF=\"https://signup.live.com/signup.aspx?id=12&uiflavor=web&mkt=en-US\">get a new Microsoft account</A>.</p></div>\r\n</div>\r\n\r\n</div>\r\n\r\n<ul class=\"login_cred_container\">\r\n    <!-- From ViewTemplateBase/Tiles.cshtml -->\r\n        <li id=\"login_user_chooser\" class=\"login_user_chooser\">\r\n        </li>\r\n    <!--  -->\r\n    \r\n\r\n\r\n    <!-- From ViewTemplateBase/Tiles.cshtml -->\r\n    <div class=\"nav-settings-menu hidden dropdownPanel\" id=\"signedin-dropdown\"",">\r\n        <ul class=\"nav-settings-menu-list\">\r\n            <li><a href=\"#\" id=\"signedin-signout\">Sign out</a></li>\r\n            <li><a href=\"#\" id=\"signedin-signoutandforget\">Sign out and forget</a></li>\r\n        </ul>\r\n    </div>\r\n    <div class=\"nav-settings-menu hidden dropdownPanel\" id=\"signedout-dropdown\">\r\n        <ul class=\"nav-settings-menu-list\">\r\n            <li><a href=\"#\" id=\"signedout-forget\">Forget</a></li>\r\n        </ul>\r\n    </div>\r\n    <!--  -->\r\n    <li class=\"login_cred_field_container\">\r\n        <form id=\"credentials\" method=\"post\" action=\"/common/login\">\r\n        <div id=\"cred_userid_container\" class=\"login_textfield textfield\">\r\n            <span class=\"input_field textfield\">\r\n                <label for=\"cred_userid_inputtext\" class=\"no_display\">User account</label>\r\n                <div class=\"input_border\">\r\n                    <input tabindex=\"1\" id=\"cred_userid_inputtext\"\r\n                           class=\"login_textfield textfield required email field normaltext\"\r\n                           placeholder=\"Email or phone\" type=\"email\" name=\"login\"\r\n                           spellcheck=\"false\" alt=\"Email or phone\" aria-label=\"User account\"\r\n                           value=\"\" autocomplete=\"off\" />\r\n                </div>\r\n            </span>\r\n        </div>\r\n    <div id=\"looking_container\" class=\"no_display\">\r\n        <span id=\"looking_cta_text\" class=\"bigtext\">Looking for an account</span>\r\n        <span class=\"input_field normaltext login_textfield\"><a id=\"looking_cancel_link\"\r\n                                                                tabindex=\"3\" href=\"\">Cancel</a> </span>\r\n    </div>\r\n        <div id=\"redirect_cta_text\" class=\"bigtext\">Redirecting</div>\r\n    <div id=\"redirect_dots_animation\" class=\"progress\">\r\n        <div class=\"pip\">\r\n        </div>\r\n        <div class=\"pip\">\r\n        </div>\r\n        <div class=\"pip\">\r\n        </div>\r\n        <div class=\"pip\">\r\n        </div>\r\n        <div class=\"pip\">\r\n        </div>\r\n    </div>\r\n        <div id=\"cred_password_container\" class=\"login_textfield textfield\">\r\n            <span class=\"input_field textfield\">\r\n                <label for=\"cred_password_inputtext\" class=\"no_display\">Password</label>\r\n                <div class=\"input_border\">\r\n                    <input tabindex=\"2\" id=\"cred_password_inputtext\"\r\n                           class=\"login_textfield textfield required field normaltext\"\r\n                           placeholder=\"Password\" spellcheck=\"false\" aria-label=\"Password\"\r\n                           alt=\"Password\" type=\"password\" name=\"passwd\" value=\"\" />\r\n                </div>\r\n            </span>\r\n        </div>\r\n        <div id=\"redirect_message_container\" class=\"login_textfield\">\r\n            <span class=\"input_field normaltext\">\r\n                <div>\r\n                    <span id=\"redirect_message_text\">We're taking you to your organization's sign-in page.)</span><span\r\n                                                                                                                id=\"redirect_company_name_text\"></span> <a id=\"redirect_cancel_link\" tabindex=\"3\"\r\n                                                                                                                                                           href=\"\">Cancel</a>\r\n                </div>\r\n            </span>\r\n        </div>\r\n    <div id=\"cred_hidden_inputs_container\" style=\"display: none\">\r\n  <input type=\"hidden\" name=\"ctx\" value=\"rQIIAbPSySgpKSi20tcvyC8qSczRy81MLsovzk8ryc_LycxL1UvOz9XLL0rPTAGxioS4BPik3bf9XsTguE6iuTkpbdG7VYzKhI3Qv8DI-IKR8RaToH9RumdKeLFbakpqUWJJZn7eIybe0OLUIv-8nMqQ_OzUvEnMfDn56Zl58cVFafFpOfnlQAGgCQWJySXxJZnJ2aklu5hVTC3TUizNzZN0DUwMjXRN0iwNdC1SjS11k4zNjNOS0szN05JSL7AIHOBkBAA1\" />\r\n  <input type=\"hidden\" name=\"flowToken\" value=\"AAABAAEAiL9Kn2Z27UubvWFPbm0gLXX9dAWYsxiWbuJ8WewATgB8nTJs3pbNxqYxc_cM-_HFrtg_RtnfZ8GI78U5oIyEy3xLz30obMMIXf3Xa0uy970gAA\" />\r\n</div>\r\n</form>\r\n\r\n    </li>\r\n\r\n        <li class=\"login_splitter_control\">\r\n            \r\n\r\n<div id=\"splitter-tiles-view\">\r\n    <div>\r\n            <script>\r\n            Constants.SplitterControlData = [\r\n                {\r\n                    \"name\": \"Work or school account\",\r\n                    \"login\": \"Assigned by your work or school\",\r\n                    \"image\": \"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/images/work_account.png\",\r\n                    \"link\": 'MSLogin.SplitterControl.LoginAAD',\r\n                    \"authUrl\": '',\r\n                    \"id\": 'aad_account_tile',\r\n                    \"domainHint\": ''\r\n                }, {\r\n                    \"name\": \"Microsoft account\",\r\n                    \"login\": \"Personal account\",\r\n                    \"image\": \"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/images/personal_account.png\",\r\n                    \"link\": 'MSLogin.SplitterControl.LoginMSA',\r\n                    \"authUrl\": 'https://login.live.com/login.srf?wa=wsignin1.0\\u0026wtrealm=urn%3afederation%3aMicrosoftOnline\\u0026wctx=estsredirect%3d2%26estsrequest%3drQIIAbPSySgpKSi20tcvyC8qSczRy81MLsovzk8ryc_LycxL1UvOz9XLL0rPTAGxioS4BPik3bf9XsTguE6iuTkpbdG7VYzKhI3Qv8DI-IKR8RaToH9RumdKeLFbakpqUWJJZn7eIybe0OLUIv-8nMqQ_OzUvEnMfDn56Zl58cVFafFpOfnlQAGgCQWJySXxJZnJ2aklu5hVTC3TUizNzZN0DUwMjXRN0iwNdC1SjS11k4zNjNOS0szN05JSL7AIHOBkBAA1\\u0026id=',\r\n                    \"id\": 'mso_account_tile',\r\n                    \"domainHint\": 'msa'\r\n                }];\r\n            </script>\r\n    </div>\r\n    <div id=\"splitter-tiles-container\"></div>    \r\n</div>\r\n        </li>\r\n    <li class=\"login_cred_options_container\" id=\"login_cred_options_container\">\r\n        <div id=\"cred_kmsi_container\" class=\"subtext normaltext\">\r\n    <span class=\"input_field \">\r\n        <input tabindex=\"10\" id=\"cred_keep_me_signed_in_checkbox\" type=\"checkbox\" value=\"0\"\r\n            name=\"persist\">\r\n        <label id=\"keep_me_signed_in_label_text\" for=\"cred_keep_me_signed_in_checkbox\" class=\"persist_text\">Keep me signed in</label>\r\n    </span>\r\n</div>\r\n\r\n            <span id=\"cred_sign_in_button\" tabindex=\"11\"\r\n          class=\"button normaltext cred_sign_in_button refresh_domain_state control-button button-two button_primary\" role=\"button\">Sign in</span>\r\n\r\n        \r\n    <span id=\"cred_cancel_button\"\r\n          class=\"button normaltext cred_cancel_button control-button button-one no_display\"\r\n          tabindex=\"11\"\r\n          role=\"button\">\r\n        Cancel\r\n    </span>\r\n\r\n        \r\n  <div id=\"recover_container\" class=\"subtext smalltext\">\r\n    <span>\r\n        <a id=\"cred_forgot_password_link\" tabindex=\"12\"\r\n            href=\"https://passwordreset.microsoftonline.com/?ru=https%3a%2f%2flogin.microsoftonline.com%2fcommon%2freprocess%3fctx%3drQIIAbPSySgpKSi20tcvyC8qSczRy81MLsovzk8ryc_LycxL1UvOz9XLL0rPTAGxioS4BPik3bf9XsTguE6iuTkpbdG7VYzKhI3Qv8DI-IKR8RaToH9RumdKeLFbakpqUWJJZn7eIybe0OLUIv-8nMqQ_OzUvEnMfDn56Zl58cVFafFpOfnlQAGgCQWJySXxJZnJ2aklu5hVTC3TUizNzZN0DUwMjXRN0iwNdC1SjS11k4zNjNOS0szN05JSL7AIHOBkBAA1&amp;mkt=en-US\">Can’t access your account?</a>\r\n    </span>\r\n</div>  \r\n\r\n        \r\n    <div id=\"alternative-identity-providers\">\r\n    <hr class=\"marginTop30px marginBottom30px borderNone\" color=\"#cccccc\" width=\"340\" size=\"1\" align=\"left\">\r\n\r\n        <div class=\"smalltext\">Don’t have an account assigned by your work or school?\r\n            <br /><a href=\"https://login.live.com/login.srf?wa=wsignin1.0&wtrealm=urn%3afederation%3aMicrosoftOnline&wctx=estsredirect%3d2%26estsrequest%3drQIIAbPSySgpKSi20tcvyC8qSczRy81MLsovzk8ryc_LycxL1UvOz9XLL0rPTAGxioS4BPik3bf9XsTguE6iuTkpbdG7VYzKhI3Qv8DI-IKR8RaToH9RumdKeLFbakpqUWJJZn7eIybe0OLUIv-8nMqQ_OzUvEnMfDn56Zl58cVFafFpOfnlQAGgCQWJySXxJZnJ2aklu5hVTC3TUizNzZN0DUwMjXRN0iwNdC1SjS11k4zNjNOS0szN05JSL7AIHOBkBAA1&id=\">Sign in with a Microsoft account</a>\r\n        </div>\r\n    </div>\r\n\r\n        <div id=\"guest_hint_text\" class=\"guest_direction_hint smalltext\">Don’t have an account assigned by your work or school?</div>\r\n<div class=\"guest_redirect_container\">\r\n    <span class=\"guest_redirect smalltext\">\r\n        <span>\r\n            <a id=\"guest_redirect_link\" tabindex=\"20\"\r\n                        href=\"https://login.live.com/login.srf?wa=wsignin1.0&amp;wtrealm=urn%3afederation%3aMicrosoftOnline&amp;wctx=estsredirect%3d2%26estsrequest%3drQIIAbPSySgpKSi20tcvyC8qSczRy81MLsovzk8ryc_LycxL1UvOz9XLL0rPTAGxioS4BPik3bf9XsTguE6iuTkpbdG7VYzKhI3Qv8DI-IKR8RaToH9RumdKeLFbakpqUWJJZn7eIybe0OLUIv-8nMqQ_OzUvEnMfDn56Zl58cVFafFpOfnlQAGgCQWJySXxJZnJ2aklu5hVTC3TUizNzZN0DUwMjXRN0iwNdC1SjS11k4zNjNOS0szN05JSL7AIHOBkBAA1&amp;id=\">Sign in with a Microsoft account</a>\r\n        </span>\r\n    </span>\r\n</div>\r\n\r\n\r\n    </li>\r\n</ul>\r\n<div id=\"samlrequest_container\" class=\"no_display\">\r\n    <form id=\"samlform\" method=\"post\" action=\"/common/login\">\r\n        <input type=\"hidden\" id=\"samlrelaystate\" name=\"RelayState\" />\r\n        <input type=\"hidden\" id=\"samlrequest\" name=\"SAMLRequest\" />\r\n    </form>\r\n</div>\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n                            </div>\r\n                            <div class=\"push\">\r\n                            </div>\r\n                        </div>\r\n<div id=\"footer_links_container\" class=\"login_footer_container\">\r\n    <div class=\"footer_inner_container\">\r\n        <table id=\"footer_table\">\r\n            <tr>\r\n                <td>\r\n                    <div class=\"footer_glyph\">\r\n                        <img src=\"https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/images/ad_glyph_footer_30x30.png\" \r\n                                class=\"footer_glyph\" alt=\"Work or school account symbol\" />\r\n                    </div>\r\n                </td>\r\n                <td>\r\n                    <div class=\"footer tinytext\">\r\n                        <span class=\"corporate_footer\"><span class=\"branding_footer\">Your work or school account can be used anywhere you see this symbol.</span>\r\n                                <span class=\"corp_link\" id=\"footer_copyright_link\">\r\n                                    © 2015 Microsoft\r\n                                </span>\r\n                                <span class=\"corp_link\">\r\n                                    <a id=\"footer_link_terms\" tabindex=\"38\" href=\"https://login.microsoftonline.com/termsofuse\">Terms of use</a>\r\n                                </span>\r\n                                <span class=\"corp_link\">\r\n                                    <a id=\"footer_link_privacy\" tabindex=\"39\" href=\"https://login.microsoftonline.com/privacy\">Privacy &amp; Cookies</a>\r\n                                </span>\r\n                        </span>\r\n                    </div>\r\n                </td>\r\n            </tr>\r\n        </table>\r\n    </div>\r\n</div>\r\n<div id=\"login_prefetch_container\" class=\"no_display\">\r\n</div>\r\n                    </td>\r\n                </tr>\r\n            </table>\r\n        </div>\r\n        \r\n\r\n<script type=\"text/javascript\">\r\n    Constants.PREFILL_MEMBER_NAME = '';\r\n    Constants.MEMBER_NAME = \"\";\r\n    Constants.DEFAULT_FOOTER_LINKS = {\r\n        'legal': {\r\n            'label': 'Legal',\r\n            'url': ''\r\n        },\r\n        'helpcentral': {\r\n            'label': 'Help',\r\n            'url': ''\r\n        },\r\n        'feedback': {\r\n            'label': 'Feedback',\r\n            'url': ''\r\n        },\r\n        'privacyandcookies': {\r\n            'label': 'Privacy \\u0026 Cookies',\r\n            'url': 'https://login.microsoftonline.com/privacy'\r\n        },\r\n        'helpfor2fa': {\r\n            'label': 'Help',\r\n            'url': 'http://g.microsoftonline.com/0AX00en-US/670'\r\n        }\r\n    };\r\n\r\n    Constants.DEFAULT_ENABLED_FOOTER_LINKS = [];\r\n    Constants.FOOTER_LINKS = '';\r\n    Constants.REDIRECT_MESSAGES = {\r\n        'AAD': \"We\\u0027re taking you to your organization\\u0027s sign-in page.\",\r\n        'MSA': \"We‘re taking you to the Microsoft account sign-in page.\"\r\n    };\r\n\r\n    User.ProcessFooterLinks(Constants.FOOTER_LINKS);\r\n\r\n    Constants.FEDERATION_QUERY_PARAMETERS = 'username=\\u0026wa=wsignin1.0\\u0026wtrealm=urn%3afederation%3aMicrosoftOnline\\u0026wctx=estsredirect%3d2%26estsrequest%3drQIIAbPSySgpKSi20tcvyC8qSczRy81MLsovzk8ryc_LycxL1UvOz9XLL0rPTAGxioS4BPik3bf9XsTguE6iuTkpbdG7VYzKhI3Qv8DI-IKR8RaToH9RumdKeLFbakpqUWJJZn7eIybe0OLUIv-8nMqQ_OzUvEnMfDn56Zl58cVFafFpOfnlQAGgCQWJySXxJZnJ2aklu5hVTC3TUizNzZN0DUwMjXRN0iwNdC1SjS11k4zNjNOS0szN05JSL7AIHOBkBAA1';\r\n    Constants.CONTEXT = 'rQIIAbPSySgpKSi20tcvyC8qSczRy81MLsovzk8ryc_LycxL1UvOz9XLL0rPTAGxioS4BPik3bf9XsTguE6iuTkpbdG7VYzKhI3Qv8DI-IKR8RaToH9RumdKeLFbakpqUWJJZn7eIybe0OLUIv-8nMqQ_OzUvEnMfDn56Zl58cVFafFpOfnlQAGgCQWJySXxJZnJ2aklu5hVTC3TUizNzZN0DUwMjXRN0iwNdC1SjS11k4zNjNOS0szN05JSL7AIHOBkBAA1';\r\n    Constants.BASE_URL = '/common/reprocess?';\r\n    Constants.LATENCY_THRESHOLD = 2000;\r\n\r\n    Constants.CDN_IMAGE_PATH = 'https://secure.aadcdn.microsoftonline-p.com/ests/1.0.0.74/content/images/';\r\n    Constants.PREFETCH_URL = \"\";\r\n    Constants.IS_USE_OTHER_ACCOUNT_VISIBLE = true;\r\n    Constants.OTHER_ACCOUNT_TEXT = \"Use another account\";\r\n    Constants.MAX_USER_TILES = 5;\r\n    try {\r\n        Constants.FEATURE_SLOT_MASK = 39847;\r\n        Constants.FEATURE_SLOT_THRESHOLD = 2147482559;\r\n    } catch (err) {\r\n        Util.debug_console('params slots ' + err);\r\n    }\r\n    Constants.MSA_LABEL = \"(Microsoft account)\";\r\n    Constants.PARTNER_NAME = \"Sign in with your work or school account\";\r\n    Constants.DIR = 'ltr';\r\n    Constants.METRICS_MODE = 1;  // Client metrics mode.\r\n    Constants.TokenizedStringMsgs.GENERIC_ERROR = \"\\u003cH1\\u003eSorry, but we\\u0027re having trouble signing you in\\u003c/H1\\u003e\\u003cp\\u003ePlease try again in a few minutes. If this doesn\\u0027t work, you might want to contact your admin and report the following error: #~#ErrorCode#~#.\\u003c/p\\u003e\";\r\n    Constants.TokenizedStringMsgs.UPN_DISAMBIGUATE_MESSAGE = \"It looks like {0} is used with more than one account. Which account do you want to use?\";\r\n    Constants.LCID = \"1033\";\r\n    Constants.MSA_ACCOUNT_IMG_ALT_TEXT = \"Microsoft account symbol\";\r\n    Constants.AAD_ACCOUNT_IMG_ALT_TEXT = \"Work or school account symbol\";\r\n    Constants.MSA_ACCOUNT_TILE_ALT_TEXT = \"Microsoft account for {0}\";\r\n    Constants.AAD_ACCOUNT_TILE_ALT_TEXT = \"Work or school account for {0}\";\r\n    Constants.REALM_RESOLVER_URL = \"/common/userrealm/\";\r\n    Constants.FORCED_SIGN_IN = false;\r\n    Constants.MSA_AUTH_URL = 'https://login.live.com/login.srf?wa=wsignin1.0\\u0026wtrealm=urn%3afederation%3aMicrosoftOnline\\u0026wctx=estsredirect%3d2%26estsrequest%3drQIIAbPSySgpKSi20tcvyC8qSczRy81MLsovzk8ryc_LycxL1UvOz9XLL0rPTAGxioS4BPik3bf9XsTguE6iuTkpbdG7VYzKhI3Qv8DI-IKR8RaToH9RumdKeLFbakpqUWJJZn7eIybe0OLUIv-8nMqQ_OzUvEnMfDn56Zl58cVFafFpOfnlQAGgCQWJySXxJZnJ2aklu5hVTC3TUizNzZN0DUwMjXRN0iwNdC1SjS11k4zNjNOS0szN05JSL7AIHOBkBAA1\\u0026id=';\r\n    Constants.IS_CXH_REQUEST = false;\r\n    Constants.IS_ADAL_REQUEST = false;\r\n    Constants.IS_NAME_COEXISTENCE_ACCOUNT = false;\r\n    Constants.ADAL_UX_OVERRIDE = false;\r\n    Constants.CANCEL_REDIRECT_URL = 'https%3a%2f%2fportal.microsoftonline.com%3ferror%3daccess_denied%26error_subcode%3dcancel';\r\n    Constants.IS_MSA_SUPPORTED = true;\r\n    Constants.IS_MSA_PHONE_USERNAME_SUPPORTED = true;\r\n    Constants.IS_MSA_REDIR_SUPPORTED = false;\r\n    Constants.MSA_DOMAIN = 'live.com';\r\n    Constants.PROMPT = '';\r\n    Constants.CLICKFORMORE = \"Click for more actions\";\r\n    Constants.CONNECTEDTOWINDOWS = \"Connected to Windows\";\r\n    Constants.SIGNEDIN = \"Signed in\";\r\n    Constants.CLICKTOSIGNIN = \"\";\r\n    Constants.SIGNINGOUT = \"Signing out...\";\r\n    Constants.USERNAME_HINT_TEXT = 'Email or phone';\r\n    Constants.IS_LOGOUT_REQUEST = false;\r\n    Constants.SHOULD_HIDE_SIGNUP = false;\r\n    Constants.USE_DARK_TILE_LOGO = false;\r\n    Constants.HAS_ERROR = false;\r\n    Constants.IS_MOBILE = false;\r\n    Constants.SIGNOUTFORGET_URL_TEMPLATE = \"/uxlogout?sessionId={0}&amp;shouldForgetUser={1}\";\r\n\r\n    // Setup cta message fields.\r\n    User.setupCallToActionMessages();\r\n\r\n    Constants.SPLIT_VIEW_ENABLED = true;\r\n\r\n    // Other tile\r\n    Tiles.otherJSON = {\r\n        'name': 'Use another account',\r\n        'login': '',\r\n        'imageAAD': 'other_glyph.png',\r\n        'imageMSA': 'other_glyph.png',\r\n        'isLive': false,\r\n        'link': 'other',\r\n        'authUrl': '',\r\n        'sessionID': '',\r\n        'domainHint': 'other'\r\n    };\r\n</script>\r\n\r\n\r\n\r\n    \r\n\r\n    </body>\r\n</html>\r\n",null]}