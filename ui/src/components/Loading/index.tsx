import "./index.css";
export const Loading = (props: any) => {
  return (
    <div className="loading span-full">
      <div className="lds-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
};
