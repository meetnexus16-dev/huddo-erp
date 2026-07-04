import React, { createContext, useContext, useState, useEffect } from 'react';

const RetailerAuthContext = createContext();

export const RetailerAuthProvider = ({ children, currentRole = "retailer" }) => {
  const [user, setUser] = useState(null);
  const [retailer, setRetailer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/profile')
      .then(res => res.json())
      .then(profileRes => {
        if (profileRes.success && profileRes.data) {
          const uData = profileRes.data;
          return fetch(`/api/retailers?user=${uData._id}`)
            .then(res => res.json())
            .then(retRes => {
              if (retRes.success && retRes.data && retRes.data.length > 0) {
                const retData = retRes.data[0];
                const mappedUser = {
                  id: retData._id || retData.id,
                  name: retData.business_name || uData.name,
                  ownerName: retData.owner_name,
                  role: currentRole.toLowerCase(),
                  category: retData.category || "Standard",
                  cityManagerId: retData.assigned_city_manager?._id || retData.assigned_city_manager || "",
                  promoterId: retData.assigned_promoter?._id || retData.assigned_promoter || "",
                  state: retData.state,
                  city: retData.city,
                  creditLimit: retData.credit_limit,
                  mobile: retData.mobile,
                  email: retData.email,
                  address: retData.shop_address,
                  rawUser: uData,
                  rawRetailer: retData
                };
                setUser(mappedUser);
                setRetailer(retData);
              } else {
                setUser({
                  id: uData._id,
                  name: uData.name,
                  role: currentRole.toLowerCase(),
                  category: "Standard",
                  cityManagerId: "",
                  promoterId: "",
                  rawUser: uData
                });
              }
            });
        } else {
          throw new Error("Failed to load user profile");
        }
      })
      .catch(err => {
        console.error("Error loading retailer auth context:", err);
        setUser({
          id: "RTL-001",
          name: "Raj Footwear",
          role: currentRole.toLowerCase(),
          category: "Gold",
          cityManagerId: "CM-007",
          promoterId: "PRO-003"
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentRole]);

  return (
    <RetailerAuthContext.Provider value={{ user, retailer, loading }}>
      {children}
    </RetailerAuthContext.Provider>
  );
};

export const useRetailerAuth = () => {
  const context = useContext(RetailerAuthContext);
  if (!context) {
    throw new Error("useRetailerAuth must be used within a RetailerAuthProvider");
  }
  return context;
};
