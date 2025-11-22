import React from "react";
import BrandIconGrid from "./BrandIconGrid";
import ModelIconGrid from "./ModelIconGrid";

export default function ModelStep(props) {
  // If no brand selected yet, show brand grid
  if (!props.formData.device_brand) {
    return <BrandIconGrid {...props} />;
  }
  
  // If brand selected, show model grid
  return <ModelIconGrid {...props} />;
}