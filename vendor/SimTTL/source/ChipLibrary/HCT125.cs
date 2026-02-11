// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT125.
    /// </summary>
    public class HCT125 : BaseElement
    {
        // Datasheet: https://www.ti.com/lit/ds/symlink/sn74hct125.pdf

        private const double TYP_PROPAGATION_DELAY = 12;

        #region Input Pins
        public Pin I1A;
        public Pin I1OEn;
        public Pin I2A;
        public Pin I2OEn;
        public Pin I3A;
        public Pin I3OEn;
        public Pin I4A;
        public Pin I4OEn;
        #endregion Input Pins

        #region Output Pins
        public Pin O1Y;
        public Pin O2Y;
        public Pin O3Y;
        public Pin O4Y;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT125(string Name) : this(Name, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT125(string Name, Net NetI1A, Net NetI1OEn, Net NetI2A, Net NetI2OEn, Net NetI3A, Net NetI3OEn, Net NetI4A, Net NetI4OEn) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "14");
            this.Ground[0] = new Pin(this, "GND", "7");

            this.I1A = new Pin(this, "1A", "2", LineMode.In, SignalState.L, NetI1A);
            this.I1OEn = new Pin(this, "1OEn", "1", LineMode.In, SignalState.L, NetI1OEn);
            this.I2A = new Pin(this, "2A", "5", LineMode.In, SignalState.L, NetI2A);
            this.I2OEn = new Pin(this, "2OEn", "4", LineMode.In, SignalState.L, NetI2OEn);
            this.I3A = new Pin(this, "3A", "9", LineMode.In, SignalState.L, NetI3A);
            this.I3OEn = new Pin(this, "3OEn", "10", LineMode.In, SignalState.L, NetI3OEn);
            this.I4A = new Pin(this, "4A", "12", LineMode.In, SignalState.L, NetI4A);
            this.I4OEn = new Pin(this, "4OEn", "13", LineMode.In, SignalState.L, NetI4OEn);

            this.O1Y = new Pin(this, "1Y",  "3", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);
            this.O2Y = new Pin(this, "2Y",  "6", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);
            this.O3Y = new Pin(this, "3Y",  "8", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);
            this.O4Y = new Pin(this, "4Y", "11", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[4][];
            SetPinArray(Inputs, 0, new Pin[] { this.I1A, this.I1OEn });
            SetPinArray(Inputs, 1, new Pin[] { this.I2A, this.I2OEn });
            SetPinArray(Inputs, 2, new Pin[] { this.I3A, this.I3OEn });
            SetPinArray(Inputs, 3, new Pin[] { this.I4A, this.I4OEn });

            Outputs = new Pin[4][];
            SetPinArray(Outputs, 0, this.O1Y);
            SetPinArray(Outputs, 1, this.O2Y);
            SetPinArray(Outputs, 2, this.O3Y);
            SetPinArray(Outputs, 3, this.O4Y);
        }
        #endregion Constructors

        #region Private Methods
        /// <summary>
        /// Implement the tri-state buffer function.
        /// </summary>
        /// <param name="InA">Input Pin A.</param>
        /// <param name="InOEn">Output enable input.</param>
        /// <param name="OutY">Output pin to set.</param>
        private void Buffer(Pin InA, Pin InOEn, Pin OutY)
        {
            if (InOEn.State == SignalState.L)
                OutY.NewOutState = InA.State;
            else
                OutY.NewOutState = SignalState.Z;
        }
        #endregion Private Methods

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            Buffer(I1A, I1OEn, O1Y);
            Buffer(I2A, I2OEn, O2Y);
            Buffer(I3A, I3OEn, O3Y);
            Buffer(I4A, I4OEn, O4Y);
        }
        #endregion Public Methods

    }
}
