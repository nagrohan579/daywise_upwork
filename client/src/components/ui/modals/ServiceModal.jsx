import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import Input from "../Input/Input";
import Textarea from "../Input/Textarea";
import ColorPicker from "../ColorPicker/ColorPicker";
import Checkbox from "../Input/Checkbox";
import Button from "../Button";

const ServicesModal = ({
  showServiceModal,
  setShowServiceModal,
  mode = "create",
}) => {
  const isEdit = mode === "edit";

  return (
    <Modal
      show={showServiceModal}
      onHide={() => setShowServiceModal(false)}
      centered
      backdrop="static"
      className="serviceModal "
    >
      <Modal.Header>
        <div className="content-wrap">
          <Modal.Title>
            {isEdit ? "Edit Service/Appointment" : "Create Service/Appointment"}
          </Modal.Title>
          <p>
            {isEdit
              ? "Configure your details"
              : "Create a service or appointment type to offer to customers"}
          </p>
        </div>
        <button
          className="close-btn"
          onClick={() => setShowServiceModal(false)}
        >
          <IoClose size={20} color="#64748B" />
        </button>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={""}>
          <Input
            label="Service Name*"
            placeholder="Enter your service/appointment name "
          />
          <Textarea
            label="Description"
            placeholder="Brief description of this service"
            height="116px"
          />
          <Input label="Duration (minutes)*" placeholder="0" type="number" />

          <ColorPicker
            label="Service color"
            name="serviceColor"
            options={["#F19B11", "#D01DC7", "#5162FA"]}
            // value={selectedColor}
            // onChange={(val) =>
            //   setValue("serviceColor", val, { shouldValidate: true })
            // }
            // error={errors.serviceColor?.message}
          />
          <Checkbox
            name="serviceActive"
            label="Service is active and available for booking"
            checked={true}
            // onChange={(e) => setActive(e.target.checked)}
          />

          <div className="btn-wrap">
            <Button
              text={"Cancel"}
              style={{
                backgroundColor: "transparent",
                color: "#64748B",
                border: "1px solid #E0E9FE",
              }}
              onClick={() => setShowServiceModal(false)}
            />
            <Button text={isEdit ? "Save Changes" : "Create"} type="submit" />
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default ServicesModal;
