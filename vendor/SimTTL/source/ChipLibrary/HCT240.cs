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
    /// Class definition of the logic chip 74HCT240.
    /// </summary>
    public class HCT240 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/sn74hct240.pdf

        private const double TYP_PROPAGATION_DELAY = 12;

        #region Input Pins
        public Pin I1OEn;
        public Pin I1A0;
        public Pin I1A1;
        public Pin I1A2;
        public Pin I1A3;

        public Pin I2OEn;
        public Pin I2A0;
        public Pin I2A1;
        public Pin I2A2;
        public Pin I2A3;
        #endregion Input Pins

        #region Output Pins
        public Pin O1Y0;
        public Pin O1Y1;
        public Pin O1Y2;
        public Pin O1Y3;
        public Pin O2Y0;
        public Pin O2Y1;
        public Pin O2Y2;
        public Pin O2Y3;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT240(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT240(string Name, Net NetI1OEn, Net NetI1A0, Net NetI1A1, Net NetI1A2, Net NetI1A3, Net NetI2OEn, Net NetI2A0, Net NetI2A1, Net NetI2A2, Net NetI2A3 ) : base(Name)
        {
            this.Power[0] = new Pin(this,  "VCC", "20");
            this.Ground[0] = new Pin(this, "GND", "10");

            this.I1OEn = new Pin(this, "1OEn", "1", LineMode.In, SignalState.L, NetI1OEn);
            this.I1A0 = new Pin(this, "1A0", "2", LineMode.In, SignalState.L, NetI1A0);
            this.I1A1 = new Pin(this, "1A1", "4", LineMode.In, SignalState.L, NetI1A1);
            this.I1A2 = new Pin(this, "1A2", "6", LineMode.In, SignalState.L, NetI1A2);
            this.I1A3 = new Pin(this, "1A3", "8", LineMode.In, SignalState.L, NetI1A3);

            this.I2OEn = new Pin(this, "2OEn", "19", LineMode.In, SignalState.L, NetI2OEn);
            this.I2A0 = new Pin(this, "2A0", "11", LineMode.In, SignalState.L, NetI2A0);
            this.I2A1 = new Pin(this, "2A1", "13", LineMode.In, SignalState.L, NetI2A1);
            this.I2A2 = new Pin(this, "2A2", "15", LineMode.In, SignalState.L, NetI2A2);
            this.I2A3 = new Pin(this, "2A3", "17", LineMode.In, SignalState.L, NetI2A3);

            this.O1Y0 = new Pin(this, "1Y0", "18", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O1Y1 = new Pin(this, "1Y1", "16", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O1Y2 = new Pin(this, "1Y2", "14", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O1Y3 = new Pin(this, "1Y3", "12", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O2Y0 = new Pin(this, "2Y0",  "9", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O2Y1 = new Pin(this, "2Y1",  "7", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O2Y2 = new Pin(this, "2Y2",  "5", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O2Y3 = new Pin(this, "2Y3",  "3", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[4][];
            SetPinArray(Inputs, 0, this.I1OEn);
            SetPinArray(Inputs, 1, new Pin[] { this.I1A0, this.I1A1, this.I1A2, this.I1A3 });
            SetPinArray(Inputs, 2, this.I2OEn);
            SetPinArray(Inputs, 3, new Pin[] { this.I2A0, this.I2A1, this.I2A2, this.I2A3 });

            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, new Pin[] { this.O1Y0, this.O1Y1, this.O1Y2, this.O1Y3 });
            SetPinArray(Outputs, 1, new Pin[] { this.O2Y0, this.O2Y1, this.O2Y2, this.O2Y3 });

            SimulationRestart();
        }
        #endregion Constructors

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);

            if (I1OEn.State == SignalState.L)
            {
                O1Y0.NewOutState = Pin.InvertedState(I1A0.State);
                O1Y1.NewOutState = Pin.InvertedState(I1A1.State);
                O1Y2.NewOutState = Pin.InvertedState(I1A2.State);
                O1Y3.NewOutState = Pin.InvertedState(I1A3.State);
            }
            else if (I1OEn.State == SignalState.H)
            {
                O1Y0.NewOutState = SignalState.Z;
                O1Y1.NewOutState = SignalState.Z;
                O1Y2.NewOutState = SignalState.Z;
                O1Y3.NewOutState = SignalState.Z;
            }
            else
            {
                O1Y0.NewOutState = SignalState.U;
                O1Y1.NewOutState = SignalState.U;
                O1Y2.NewOutState = SignalState.U;
                O1Y3.NewOutState = SignalState.U;
            }

            if (I2OEn.State == SignalState.L)
            {
                O2Y0.NewOutState = Pin.InvertedState(I2A0.State);
                O2Y1.NewOutState = Pin.InvertedState(I2A1.State);
                O2Y2.NewOutState = Pin.InvertedState(I2A2.State);
                O2Y3.NewOutState = Pin.InvertedState(I2A3.State);
            }
            else if (I2OEn.State == SignalState.H)
            {
                O2Y0.NewOutState = SignalState.Z;
                O2Y1.NewOutState = SignalState.Z;
                O2Y2.NewOutState = SignalState.Z;
                O2Y3.NewOutState = SignalState.Z;
            }
            else
            {
                O2Y0.NewOutState = SignalState.U;
                O2Y1.NewOutState = SignalState.U;
                O2Y2.NewOutState = SignalState.U;
                O2Y3.NewOutState = SignalState.U;
            }
        }
        #endregion Public Methods

    }
}
