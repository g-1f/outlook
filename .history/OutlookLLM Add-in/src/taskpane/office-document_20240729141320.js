// /* global Office console */

// const insertText = async (text, writeSubject) => {
//   // Write text to the cursor point in the compose surface.
//   try {
//     if (writeSubject) {
//       const respSetSubject = await Office.context.mailbox.item.subject.setAsync(
//         text.subject,
//         { coercionType: Office.CoercionType.Text },
//         (asyncResult) => {
//           if (asyncResult.status === Office.AsyncResultStatus.Failed) {
//             throw asyncResult.error.message;
//           }
//         }
//       );  
//     }
//     console.log('emailbody: '+ text.body);  

//     const respSetBody = await Office.context.mailbox.item.body.setSelectedDataAsync(
//       text.body.replace(/\n/g, '<br>'),
//       { coercionType: Office.CoercionType.Html },
//       (asyncResult) => {
//         if (asyncResult.status === Office.AsyncResultStatus.Failed) {
//           throw asyncResult.error.message;
//         }
//       }
//     );

//   } catch (error) {
//     console.log("Error: " + error);
//   }
// };

// export default insertText;

<!DOCTYPE html>
<html lang="en" data-framework="javascript">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=Edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Outlook LLM - Compose with AI</title>
    <!-- Office JavaScript API -->
    <script type="text/javascript" src="https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js"></script>
    <!-- Adaptive Cards CSS -->
    <link rel="stylesheet" href="https://unpkg.com/adaptivecards/dist/adaptivecards.css" />
</head>
<body style="width: 100%; height: 100%; margin: 0; padding: 0;">
    <div id="container"></div>
    <div id="tridentmessage" style="display: none; padding: 10;">
        This add-in will not run in your version of Office. Please upgrade either to perpetual Office 2021 (or later) 
        or to a Microsoft 365 account.
    </div>
    <script>
        if ((navigator.userAgent.indexOf("Trident") !== -1) || (navigator.userAgent.indexOf("Edge") !== -1)) {
            var tridentMessage = document.getElementById("tridentmessage");
            var normalContainer = document.getElementById("container");
            tridentMessage.style.display = "block";
            normalContainer.style.display = "none";
        }
    </script>
    <!-- Your bundled JavaScript file -->
    <script type="text/javascript" src="bundle.js"></script>
</body>
</html>