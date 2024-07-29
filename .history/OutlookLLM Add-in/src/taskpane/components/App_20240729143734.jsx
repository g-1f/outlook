// // import * as React from "react";
// // import EmailGenerator from "./EmailGenerator";
// // import { makeStyles } from "@fluentui/react-components";

// // const useStyles = makeStyles({
// //   root: {
// //     height: "100vh",
// //     display: "flex",
// //     flexDirection: "column",
// //     backgroundColor: "#f0f0f0",
// //     backgroundImage: "linear-gradient(to bottom, #f5f5f5, #e0e0e0)",
// //     overflowX: "hidden",
// //     overflowY: "auto",
// //   },
// //   content: {
// //     flex: 1,
// //     display: "flex",
// //     justifyContent: "center",
// //     alignItems: "flex-start",
// //     padding: "20px 0",
// //     boxSizing: "border-box",
// //     width: "100%",
// //   },
// // });

// // const App = () => {
// //   const styles = useStyles();

// //   return (
// //     <div className={styles.root}>
// //       <main className={styles.content}>
// //         <EmailGenerator />
// //       </main>
// //     </div>
// //   );
// // };

// // export default App;

// import * as React from "react";
// import EmailGenerator from "./EmailGenerator";
// import { makeStyles } from "@fluentui/react-components";

// const useStyles = makeStyles({
//   root: {
//     height: "100vh",
//     display: "flex",
//     flexDirection: "column",
//     backgroundColor: "#ffffff",
//     overflowX: "hidden",
//     overflowY: "auto",
//   },
//   content: {
//     flex: 1,
//     display: "flex",
//     justifyContent: "center",
//     alignItems: "flex-start",
//     padding: "20px 10px",
//     boxSizing: "border-box",
//     width: "100%",
//   },
// });

// const App = () => {
//   const styles = useStyles();

//   return (
//     <div className={styles.root}>
//       <main className={styles.content}>
//         <EmailGenerator />
//       </main>
//     </div>
//   );
// };

// export default App;

import React from "react";
import EmailGenerator from "./EmailGenerator";

const App = () => {
  return (
    <div style={{ height: "100vh", backgroundColor: "#ffffff", overflow: "auto" }}>
      <EmailGenerator />
    </div>
  );
};

export default App;